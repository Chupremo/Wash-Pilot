/* WashPilot shared page integration.
 * Reuses the existing Supabase project, auth session and per-business workspace
 * format used by index.html. This file deliberately does not create a second
 * database or a second storage namespace.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://spqvdjknfeylorrjbhfm.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mXS2SCnBvioY38EL3a-6UA_yGkBXe0c';
  const AUTH_OPTIONS = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  };
  let client = null;
  let workspaceCache = null;

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('WashPilot account services could not load. Refresh the page and try again.');
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: AUTH_OPTIONS
    });
    return client;
  }

  function safeSlug(value) {
    const base = String(value || 'carwash').normalize('NFKD').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42) || 'carwash';
    const suffix = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
    return (base + '-' + suffix).slice(0, 60);
  }

  function normalizePlan(value) {
    const plan = String(value || 'basic').toLowerCase();
    return ({ starter: 'basic', business: 'premium', pro: 'premium', standard: 'premium' })[plan]
      || (['basic', 'premium'].includes(plan) ? plan : 'basic');
  }

  function workspaceStorageKey(businessId) {
    return 'wp_real_workspace_data_' + businessId;
  }

  function readWorkspace(businessId) {
    const empty = {
      services: [], transactions: [], employees: [], expenses: [], inventory: [],
      branches: [], customers: [], recipes: [], inventoryMovements: [],
      loyaltyLedger: [], packages: [], packageSales: [], shiftClosings: [],
      shifts: [], shift: null, packageRedemptions: [], subscriptionInvoices: []
    };
    try {
      const raw = window.localStorage.getItem(workspaceStorageKey(businessId));
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return empty;
      const state = Object.assign({}, empty, parsed);
      Object.keys(empty).forEach(key => {
        if (Array.isArray(empty[key]) && !Array.isArray(state[key])) state[key] = [];
      });
      if (!Object.prototype.hasOwnProperty.call(state, 'shift')) state.shift = null;
      return state;
    } catch (error) {
      console.warn('WashPilot: could not read the local workspace cache.', error);
      return empty;
    }
  }

  function writeWorkspace(workspace) {
    if (!workspace || !workspace.business || !workspace.business.id) {
      throw new Error('The business workspace is not ready. Please sign in again.');
    }
    try {
      window.localStorage.setItem(workspaceStorageKey(workspace.business.id), JSON.stringify(workspace.data));
      window.localStorage.setItem('wp_real_workspace_plan_' + workspace.business.id, normalizePlan(workspace.subscription?.plan_code));
    } catch (error) {
      throw new Error('Your browser could not save the WashPilot workspace. Check available browser storage and try again.');
    }
  }

  async function resolveWorkspace() {
    const sb = getClient();
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData?.session?.user;
    if (!user) {
      workspaceCache = null;
      return null;
    }
    if (workspaceCache && workspaceCache.user.id === user.id) return workspaceCache;

    const { data: adminRecord, error: adminError } = await sb
      .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (adminError) throw new Error('Could not verify WashPilot administrator access: ' + adminError.message);
    if (adminRecord) {
      workspaceCache = { user, isAdmin: true, business: null, subscription: null, data: null };
      return workspaceCache;
    }

    let businessId = null;
    const { data: membership, error: membershipError } = await sb
      .from('business_members').select('business_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (!membershipError && membership?.business_id) businessId = membership.business_id;

    if (!businessId) {
      const meta = user.user_metadata || {};
      const businessName = String(meta.business_name || '').trim();
      if (businessName.length < 2) {
        throw new Error(membershipError?.message || 'No carwash business is linked to this account. Contact WashPilot support for help.');
      }
      const { data, error } = await sb.rpc('create_business_with_trial', {
        p_name: businessName,
        p_slug: String(meta.business_slug || safeSlug(businessName)),
        p_contact_email: user.email || null,
        p_contact_phone: meta.business_phone || null,
        p_address: meta.business_address || null
      });
      if (error) throw error;
      businessId = data;
    }

    const { data: business, error: businessError } = await sb
      .from('businesses').select('id,name,status,created_at').eq('id', businessId).single();
    if (businessError) throw new Error('Your business was found, but its workspace could not be loaded: ' + businessError.message);

    const { data: subscription, error: subscriptionError } = await sb
      .from('subscriptions')
      .select('plan_code,status,trial_starts_at,trial_ends_at,current_period_ends_at,admin_trial_enabled')
      .eq('business_id', businessId).single();
    if (subscriptionError) throw new Error('Your business is available, but its plan could not be loaded: ' + subscriptionError.message);

    workspaceCache = {
      user,
      isAdmin: false,
      business,
      subscription,
      data: readWorkspace(businessId)
    };
    return workspaceCache;
  }

  function redirectFor(workspace) {
    return workspace?.isAdmin ? '/platform/overview' : '/dashboard.html';
  }

  async function signIn(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) return { ok: false, message: 'Enter your email address and password.' };
    const { data, error } = await getClient().auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) return { ok: false, message: error.message || 'We could not sign you in. Check your email and password.' };
    workspaceCache = null;
    const workspace = await resolveWorkspace();
    if (!workspace) return { ok: false, message: 'Your WashPilot session could not be opened. Please sign in again.' };
    return { ok: true, redirectUrl: redirectFor(workspace), user: data?.user || workspace.user };
  }

  async function signUp(values) {
    const fullName = String(values?.name || '').trim();
    const businessName = String(values?.business || '').trim();
    const email = String(values?.email || '').trim().toLowerCase();
    const password = String(values?.password || '');
    if (fullName.length < 2 || businessName.length < 2 || !email || password.length < 8) {
      return { ok: false, message: 'Complete your name, business name, email and a password of at least 8 characters.' };
    }
    const meta = {
      full_name: fullName,
      business_name: businessName,
      business_slug: safeSlug(businessName),
      business_phone: null,
      business_address: null,
      opening_time: '08:00',
      closing_time: '18:00',
      intended_plan: 'basic',
      signup_source: 'washpilot_standalone_signup'
    };
    const { data, error } = await getClient().auth.signUp({
      email,
      password,
      options: { data: meta, emailRedirectTo: window.location.origin + '/dashboard.html' }
    });
    if (error) return { ok: false, message: error.message || 'We could not create your account.' };

    if (data?.session) {
      workspaceCache = null;
      const workspace = await resolveWorkspace();
      if (!workspace) throw new Error('Your account was created, but we could not open its workspace. Sign in to continue.');
      return { ok: true, redirectUrl: redirectFor(workspace) };
    }
    return {
      ok: true,
      redirectUrl: '',
      message: 'Your account has been created. Check your email for the confirmation link, then sign in to open your WashPilot workspace.'
    };
  }

  async function resetPassword(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return { ok: false, message: 'Enter the email address used for your WashPilot account.' };
    const { error } = await getClient().auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin + '/?wpRecovery=1'
    });
    if (error) return { ok: false, message: error.message || 'We could not start the password reset.' };
    return { ok: true };
  }

  async function signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
    workspaceCache = null;
  }

  async function getSession() {
    const workspace = await resolveWorkspace();
    if (workspace?.isAdmin) {
      window.location.replace('/platform/overview');
      return false;
    }
    return !!workspace;
  }

  async function getAuthenticatedRedirect() {
    const workspace = await resolveWorkspace();
    return workspace ? redirectFor(workspace) : '';
  }

  async function loadAccount() {
    const workspace = await resolveWorkspace();
    if (!workspace) throw new Error('Your WashPilot session has expired. Please sign in again.');
    if (workspace.isAdmin) return { user: { name: workspace.user.user_metadata?.full_name || workspace.user.email || 'Administrator' }, business: { name: 'WashPilot Administration' } };
    return {
      user: { name: workspace.user.user_metadata?.full_name || workspace.user.email || 'Account owner' },
      business: { name: workspace.business.name }
    };
  }

  async function loadServices() {
    const workspace = await resolveWorkspace();
    if (!workspace || workspace.isAdmin) throw new Error('A business owner account is required to use the POS.');
    return (workspace.data.services || [])
      .filter(service => service && service.active !== false && service.name && Number.isFinite(Number(service.price)) && Number(service.price) >= 0)
      .map(service => ({ id: service.id, name: service.name, price: Number(service.price), description: service.description || '' }));
  }

  function transactionDate(transaction) {
    if (transaction.createdAt) {
      const parsed = new Date(transaction.createdAt);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    if (transaction.date) {
      const parsed = new Date(String(transaction.date) + 'T12:00:00+08:00');
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return new Date().toISOString();
  }

  async function loadDashboardData() {
    const workspace = await resolveWorkspace();
    if (!workspace || workspace.isAdmin) throw new Error('A business owner account is required to view this dashboard.');
    const state = workspace.data;
    const paidTransactions = (state.transactions || []).filter(transaction => {
      if (transaction.financialStatus) return transaction.financialStatus === 'Paid';
      return !['Cancelled', 'Refunded'].includes(transaction.status);
    });
    const sales = paidTransactions.map(transaction => ({
      id: String(transaction.id || ''),
      createdAt: transactionDate(transaction),
      service: transaction.main || (Array.isArray(transaction.items) ? transaction.items.map(item => item.name).join(', ') : 'Car wash'),
      amount: Number(transaction.total || 0)
    }));
    const services = (state.services || [])
      .filter(service => service && service.active !== false)
      .map(service => ({ name: service.name, price: Number(service.price || 0) }));
    return {
      user: { name: workspace.user.user_metadata?.full_name || workspace.user.email || 'Account owner' },
      business: { name: workspace.business.name },
      plan: normalizePlan(workspace.subscription?.plan_code) === 'premium' ? 'Premium' : 'Free',
      sales,
      services
    };
  }

  async function saveSale(sale) {
    const workspace = await resolveWorkspace();
    if (!workspace || workspace.isAdmin) return { ok: false, message: 'A business owner account is required to record a sale.' };
    const state = workspace.data;
    const submitted = Array.isArray(sale?.items) ? sale.items : [];
    if (!submitted.length) return { ok: false, message: 'Add at least one service before completing the sale.' };

    const items = submitted.map(item => {
      const service = (state.services || []).find(candidate => String(candidate.id) === String(item.id) && candidate.active !== false);
      if (!service) throw new Error('One of the selected services is no longer available. Refresh the POS and try again.');
      const qty = Math.max(1, Math.floor(Number(item.qty || 1)));
      const price = Number(service.price);
      if (!Number.isFinite(price) || price < 0) throw new Error('A service price is invalid. Update the service price and try again.');
      return { id: service.id, name: service.name, price, qty };
    });

    const total = Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100;
    const now = new Date();
    const iso = now.toISOString();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = type => parts.find(value => value.type === type)?.value || '00';
    const date = part('year') + '-' + part('month') + '-' + part('day');
    const time = now.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
    const details = sale.details || {};
    const method = String(sale.paymentMethod || '').trim();
    const first = items[0];
    const transaction = {
      id: 'WP-POS-' + now.getTime().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      date,
      time,
      createdAt: iso,
      plate: String(details.plate || '').trim().toUpperCase(),
      vehicle: String(details.vehicle || '').trim(),
      customer: String(details.customer || '').trim() || 'Walk-in customer',
      main: first.name,
      mainPrice: first.price * first.qty,
      mainQty: first.qty,
      addons: items.slice(1).map(item => ({ name: item.name, price: item.price * item.qty, qty: item.qty })),
      items,
      total,
      payment: method,
      status: 'Completed',
      financialStatus: method ? 'Paid' : 'Unpaid',
      paidAt: method ? iso : null,
      paymentDate: method ? date : null,
      employee: 'Unassigned',
      notes: '',
      branch: state.branches?.[0]?.name || 'Main Branch',
      source: 'standalone_pos'
    };

    state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
    state.transactions.unshift(transaction);
    if (transaction.plate) {
      state.customers = Array.isArray(state.customers) ? state.customers : [];
      const existing = state.customers.find(customer => String(customer.plate || '').toUpperCase() === transaction.plate);
      if (existing) {
        existing.visits = Number(existing.visits || 0) + 1;
        existing.lastVisit = date;
        if (transaction.customer && transaction.customer !== 'Walk-in customer') existing.name = transaction.customer;
        if (method) existing.spent = Number(existing.spent || 0) + total;
      } else {
        state.customers.push({
          plate: transaction.plate,
          name: transaction.customer,
          vehicle: transaction.vehicle,
          visits: 1,
          spent: method ? total : 0,
          lastVisit: date
        });
      }
    }

    try {
      writeWorkspace(workspace);
      return { ok: true, transactionId: transaction.id };
    } catch (error) {
      state.transactions.shift();
      return { ok: false, message: error.message || 'The sale could not be saved.' };
    }
  }

  window.WashPilotPages = Object.freeze({
    getSession,
    getAuthenticatedRedirect,
    signIn,
    signUp,
    resetPassword,
    signOut,
    loadAccount,
    loadServices,
    loadDashboardData,
    saveSale
  });
})();
