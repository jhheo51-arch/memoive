/* Keep native scrolling inside the creator; route its inert backdrop to it too. */
(()=>{
  const panel=document.querySelector('#creator-view');
  const active=()=>panel.classList.contains('active')&&!panel.inert;
  const outside=target=>target instanceof Node&&!panel.contains(target);
  document.addEventListener('wheel',event=>{
    if(!active()||event.ctrlKey||event.defaultPrevented||!outside(event.target))return;
    if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
    const scale=event.deltaMode===1?20:event.deltaMode===2?panel.clientHeight:1;
    panel.scrollTop+=event.deltaY*scale;
    event.preventDefault();
  },{passive:false});
  let gesture=null;
  document.addEventListener('touchstart',event=>{
    gesture=active()&&outside(event.target)&&event.touches.length===1
      ?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;
  },{passive:true});
  document.addEventListener('touchmove',event=>{
    if(!gesture||!active()||event.touches.length!==1||event.defaultPrevented)return;
    const touch=event.touches[0],dy=gesture.y-touch.clientY,dx=gesture.x-touch.clientX;
    gesture={x:touch.clientX,y:touch.clientY};
    if(Math.abs(dy)<=Math.abs(dx))return;
    panel.scrollTop+=dy;event.preventDefault();
  },{passive:false});
  ['touchend','touchcancel'].forEach(name=>document.addEventListener(name,()=>gesture=null,{passive:true}));
  // Show the results immediately, without replacing the list or changing its layout.
  const browse=document.querySelector('#reuse-browse'),original=browse.onclick;
  browse.onclick=function(event){original?.call(this,event);requestAnimationFrame(()=>{
    if(!active())return;
    const results=document.querySelector('#reuse-candidates');
    if(!results.children.length)return;
    const header=panel.querySelector('header').getBoundingClientRect().height;
    panel.scrollTop+=results.getBoundingClientRect().top-panel.getBoundingClientRect().top-header-16;
  });};
})();
