/* WashPilot sandbox homepage interactions, isolated from production business data. */
(function(){
  'use strict';
  var landing=document.getElementById('publicLanding');
  if(!landing||getComputedStyle(landing).display==='none')return;

  /* Sample wash queue: local demonstration only; never calls the database. */
  (function(){
    var stages=['Arrived','Washing','Ready','Done'];
    var seed=[
      {car:'Honda City',svc:'Premium wash',s:0},
      {car:'Ford Ranger',svc:'Detailing',s:0},
      {car:'Toyota Vios',svc:'Basic wash',s:1},
      {car:'Mitsubishi Xpander',svc:'Interior clean',s:1},
      {car:'Suzuki Jimny',svc:'Basic wash + wax',s:2}
    ];
    var cars=JSON.parse(JSON.stringify(seed));
    var lanes=document.getElementById('wp-home-lanes');
    var status=document.getElementById('wp-home-board-status');
    var reset=document.getElementById('wp-home-board-reset');
    if(!lanes||!status||!reset)return;
    function render(){
      lanes.replaceChildren();
      stages.forEach(function(name,index){
        var lane=document.createElement('div');
        lane.className='wp-home-lane'+(index===3?' is-done':'');
        var heading=document.createElement('h4');
        heading.textContent=name;
        lane.appendChild(heading);
        cars.forEach(function(car){
          if(car.s!==index)return;
          var ticket=document.createElement('button');
          ticket.type='button';
          ticket.className='wp-home-ticket';
          var title=document.createElement('b');
          title.textContent=car.car;
          var service=document.createElement('span');
          service.textContent=car.svc;
          ticket.append(title,service);
          if(index<3){
            ticket.setAttribute('aria-label','Move '+car.car+' from '+name+' to '+stages[index+1]);
            ticket.addEventListener('click',function(){car.s++;render();});
          }else{
            ticket.disabled=true;
            ticket.setAttribute('aria-label',car.car+' is done');
          }
          lane.appendChild(ticket);
        });
        lanes.appendChild(lane);
      });
      var done=cars.filter(function(car){return car.s===3;}).length;
      status.textContent=done+' of '+cars.length+' vehicles done';
    }
    reset.addEventListener('click',function(){cars=JSON.parse(JSON.stringify(seed));render();});
    render();
  })();

  /* Gentle pointer tilt on desktop cards only; disabled for touch/reduced motion. */
  (function(){
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if(reduce||!fine)return;
    landing.querySelectorAll('[data-home-tilt]').forEach(function(card){
      card.addEventListener('pointermove',function(event){
        if(event.pointerType!=='mouse')return;
        var rect=card.getBoundingClientRect();
        if(!rect.width||!rect.height)return;
        var x=(event.clientX-rect.left)/rect.width-.5;
        var y=(event.clientY-rect.top)/rect.height-.5;
        card.style.transform='perspective(1000px) rotateX('+(-y*5).toFixed(2)+'deg) rotateY('+(x*7).toFixed(2)+'deg) translateY(-2px)';
      });
      card.addEventListener('pointerleave',function(){card.style.transform='';});
    });
  })();

  /* Mobile action dock appears after the customer passes the hero. */
  (function(){
    var hero=document.getElementById('wp-home-hero');
    var dock=document.getElementById('wp-home-dock');
    if(!hero||!dock)return;
    var frame=0;
    function update(){
      if(frame)return;
      frame=requestAnimationFrame(function(){
        frame=0;
        var past=hero.getBoundingClientRect().bottom<window.innerHeight*.6;
        dock.classList.toggle('show',past);
      });
    }
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update,{passive:true});
    update();
  })();
})();
/* ---------- 3D hero scene (loaded after the page so text and buttons appear first) ---------- */
(function(){
  var canvas=document.getElementById('wp-home-scene');
  var conn=navigator.connection||{};
  if(!canvas||conn.saveData)return;
  var small=window.matchMedia('(max-width: 900px)').matches;
  var lowEnd=(navigator.deviceMemory&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2);

  function start(){
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.async=true;
    s.onload=function(){try{initScene();}catch(err){canvas.style.display='none';var fallback=document.getElementById('wp-home-3d-fallback');if(fallback)fallback.style.opacity='1';}};
    s.onerror=function(){canvas.style.display='none';var fallback=document.getElementById('wp-home-3d-fallback');if(fallback)fallback.style.opacity='1';};
    document.head.appendChild(s);
  }
  if(document.readyState==='complete')setTimeout(start,50);
  else window.addEventListener('load',function(){setTimeout(start,50);});

  function initScene(){
    var T=window.THREE, renderer;
    try{
      renderer=new T.WebGLRenderer({canvas:canvas,antialias:!lowEnd,alpha:true,powerPreference:'high-performance'});canvas.style.opacity='1';var fallback=document.getElementById('wp-home-3d-fallback');if(fallback)fallback.style.opacity='0';
    }catch(err){canvas.style.display='none';return;}
    var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,small?1.5:2));
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;

    var scene=new T.Scene();
    var camera=new T.PerspectiveCamera(32,1,.1,100);
    camera.position.set(7.2,3.6,8.2);
    camera.lookAt(0,.9,0);

    scene.add(new T.HemisphereLight(0xbcd8ff,0x04122a,.9));
    var key=new T.DirectionalLight(0xffffff,1.7);key.position.set(5,7,4);scene.add(key);
    var warm=new T.PointLight(0xffc233,1.6,16);warm.position.set(-4.5,2.2,-3);scene.add(warm);
    var cool=new T.PointLight(0x52d6f4,1.8,16);cool.position.set(4.5,1.6,-4.5);scene.add(cool);
    var front=new T.PointLight(0xffffff,.8,14);front.position.set(0,3,6);scene.add(front);

    var rig=new T.Group();scene.add(rig);

    var floor=new T.Mesh(new T.CylinderGeometry(3.7,3.7,.16,small?48:72),
      new T.MeshStandardMaterial({color:0x0b2547,metalness:.5,roughness:.35}));
    floor.position.y=-.08;rig.add(floor);
    var ring=new T.Mesh(new T.TorusGeometry(3.55,.035,16,96),new T.MeshBasicMaterial({color:0x52d6f4}));
    ring.rotation.x=Math.PI/2;ring.position.y=.01;rig.add(ring);
    var ring2=new T.Mesh(new T.TorusGeometry(2.9,.02,12,96),new T.MeshBasicMaterial({color:0xffc233,transparent:true,opacity:.7}));
    ring2.rotation.x=Math.PI/2;ring2.position.y=.012;rig.add(ring2);

    var car=new T.Group();rig.add(car);
    var paint=new T.MeshPhysicalMaterial({color:0xffc233,metalness:.35,roughness:.28,clearcoat:1,clearcoatRoughness:.08});
    var glass=new T.MeshPhysicalMaterial({color:0x0a1f3a,metalness:.6,roughness:.08,clearcoat:1});
    var tire=new T.MeshStandardMaterial({color:0x0a0e14,roughness:.8});
    var rim=new T.MeshStandardMaterial({color:0xdfe9f2,metalness:.9,roughness:.25});

    var body=new T.Mesh(new T.BoxGeometry(4.2,.75,1.9),paint);body.position.y=.72;car.add(body);
    var hood=new T.Mesh(new T.BoxGeometry(1.1,.12,1.8),paint);hood.position.set(1.45,1.13,0);car.add(hood);
    var cabin=new T.Mesh(new T.CylinderGeometry(.95,1.35,.7,4,1),glass);
    cabin.rotation.y=Math.PI/4;cabin.scale.set(1.5,1,.85);cabin.position.set(-.25,1.43,0);car.add(cabin);
    var roof=new T.Mesh(new T.BoxGeometry(2.0,.07,1.12),paint);roof.position.set(-.25,1.81,0);car.add(roof);

    [[1.35,.95],[1.35,-.95],[-1.35,.95],[-1.35,-.95]].forEach(function(p){
      var w=new T.Mesh(new T.CylinderGeometry(.43,.43,.34,small?20:28),tire);
      w.rotation.x=Math.PI/2;w.position.set(p[0],.43,p[1]);car.add(w);
      var r=new T.Mesh(new T.CylinderGeometry(.25,.25,.36,16),rim);
      r.rotation.x=Math.PI/2;r.position.set(p[0],.43,p[1]);car.add(r);
    });
    var head=new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff2c2,emissiveIntensity:2});
    var tail=new T.MeshStandardMaterial({color:0xff3b3b,emissive:0xff2020,emissiveIntensity:1.6});
    [-.62,.62].forEach(function(z){
      var h=new T.Mesh(new T.BoxGeometry(.08,.2,.44),head);h.position.set(2.12,.85,z);car.add(h);
      var t=new T.Mesh(new T.BoxGeometry(.08,.18,.4),tail);t.position.set(-2.12,.85,z);car.add(t);
    });
    car.position.y=.02;

    var bubbleGeo=new T.SphereGeometry(1,small?12:20,small?10:16);
    var bubbleMat=new T.MeshPhysicalMaterial({color:0xbfeeff,metalness:0,roughness:.05,transparent:true,opacity:.32,clearcoat:small?0:1});
    var bubbles=[];
    var count=lowEnd?14:(small?26:56);
    function resetBubble(b,first){
      var a=Math.random()*Math.PI*2, rad=1.2+Math.random()*2.6;
      b.position.set(Math.cos(a)*rad,first?Math.random()*4.5:-.1,Math.sin(a)*rad);
      b.scale.setScalar(.05+Math.random()*.17);
      b.userData={v:.25+Math.random()*.55,ph:Math.random()*6.28,sway:.15+Math.random()*.3};
    }
    for(var i=0;i<count;i++){var m=new T.Mesh(bubbleGeo,bubbleMat);resetBubble(m,true);rig.add(m);bubbles.push(m);}

    function resize(){
      var w=canvas.clientWidth, h=canvas.clientHeight;
      if(!w||!h)return;
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      camera.fov=w/h<1.1?44:32;
      camera.updateProjectionMatrix();
    }
    resize();window.addEventListener('resize',resize);
    if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);

    var tx=0,ty=0,cx=0,cy=0;
    window.addEventListener('pointermove',function(e){
      var r=canvas.getBoundingClientRect();
      tx=Math.max(-1.2,Math.min(1.2,((e.clientX-r.left)/r.width-.5)*2));
      ty=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height-.5)*2));
    },{passive:true});

    var visible=true, running=false, clock=new T.Clock();
    function frame(){
      var t=clock.getElapsedTime();
      cx+=(tx-cx)*.05;cy+=(ty-cy)*.05;
      rig.rotation.y=(reduce?.6:t*.18)+cx*.7;
      rig.rotation.x=cy*.06;
      car.position.y=.02+Math.sin(t*1.2)*.04;
      ring2.rotation.z=t*.3;
      for(var i=0;i<bubbles.length;i++){
        var b=bubbles[i], d=b.userData;
        b.position.y+=d.v*.012;
        b.position.x+=Math.sin(t*1.4+d.ph)*d.sway*.004;
        if(b.position.y>4.8)resetBubble(b,false);
      }
      renderer.render(scene,camera);
    }
    function loop(){
      if(running||reduce)return;running=true;
      (function tick(){
        if(!visible||document.hidden){running=false;return;}
        frame();requestAnimationFrame(tick);
      })();
    }
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)loop();}).observe(canvas);
    }
    document.addEventListener('visibilitychange',function(){if(!document.hidden)loop();});
    canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();canvas.style.display='none';var fallback=document.getElementById('wp-home-3d-fallback');if(fallback)fallback.style.opacity='1';});
    frame();
    loop();
  }
})();
