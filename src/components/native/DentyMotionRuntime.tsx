"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const REDUCED_MOTION_QUERY="(prefers-reduced-motion: reduce)";

export function DentyMotionRuntime(){
  const pathname=usePathname();

  useEffect(()=>{
    const root=document.documentElement;
    const reduced=window.matchMedia(REDUCED_MOTION_QUERY).matches;
    root.classList.add("denty-motion-ready");

    const syncScrollState=()=>{
      root.dataset.dentyScrolled=window.scrollY>12?"true":"false";
    };
    syncScrollState();
    window.addEventListener("scroll",syncScrollState,{passive:true});

    const revealNodes=Array.from(document.querySelectorAll<HTMLElement>("[data-motion-reveal]"));
    let observer:IntersectionObserver|undefined;
    if(reduced||!("IntersectionObserver" in window)){
      revealNodes.forEach(node=>node.classList.add("is-visible"));
    }else{
      observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          (entry.target as HTMLElement).classList.add("is-visible");
          observer?.unobserve(entry.target);
        }
      },{threshold:.12,rootMargin:"0px 0px -24px 0px"});
      revealNodes.forEach(node=>observer?.observe(node));
    }

    return()=>{
      window.removeEventListener("scroll",syncScrollState);
      observer?.disconnect();
    };
  },[pathname]);

  return null;
}
