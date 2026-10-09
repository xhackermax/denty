import styles from "./cephalometry-editor.module.css";

export type Point = readonly [number, number];
export const POINTS: Record<string, Point> = {
  S: [148,190], N:[505,117], Ba:[65,374], S1:[183,367], Pt:[255,242],
  ENP:[248,365], ENA:[512,348], A:[501,380], B:[474,600],
  Pg:[474,646], Gn:[463,668], Me:[424,665], Go:[131,501],
};
const P=POINTS;
const v=(a:Point,b:Point): Point=>[b[0]-a[0],b[1]-a[1]];
export const PLANES: Record<string, readonly [Point,Point]> = {
  SN:[P.S!,P.N!], NA:[P.N!,P.A!], NB:[P.N!,P.B!],
  PP:[P.ENP!,P.ENA!], GoGn:[P.Go!,P.Gn!],
  Ploc:[[300,456],[516,476]], SGn:[P.S!,P.Gn!],
  BaN:[P.Ba!,P.N!], PtGn:[P.Pt!,P.Gn!],
};
export interface CephMeasurement {
  id:string; name:string; description:string; norm:number; sd:number;
  lines:readonly string[]; points:readonly string[];
  center:Point; d1:Point; d2:Point; radius:number; side:"L"|"R"; y:number;
  ghost?:1|2;
  interpretations: { ok:string; hi:string; lo:string };
}
export const MEASURES:readonly CephMeasurement[]=[
  {id:"SNA",name:"SNA",description:"Posición sagital del maxilar",norm:82,sd:2,lines:["SN","NA"],points:["S","N","A"],center:P.N!,d1:v(P.N!,P.S!),d2:v(P.N!,P.A!),radius:52,side:"R",y:14,interpretations:{ok:"Maxilar en posición normal",hi:"Maxilar protruido",lo:"Maxilar retruido"}},
  {id:"SNB",name:"SNB",description:"Posición sagital mandibular",norm:80,sd:2,lines:["SN","NB"],points:["S","N","B"],center:P.N!,d1:v(P.N!,P.S!),d2:v(P.N!,P.B!),radius:92,side:"R",y:88,interpretations:{ok:"Mandíbula en posición normal",hi:"Mandíbula protruida",lo:"Mandíbula retruida"}},
  {id:"ANB",name:"ANB",description:"Relación sagital intermaxilar",norm:2,sd:2,lines:["NA","NB"],points:["N","A","B"],center:P.N!,d1:v(P.N!,P.A!),d2:v(P.N!,P.B!),radius:175,side:"R",y:162,interpretations:{ok:"Clase I esquelética",hi:"Clase II esquelética",lo:"Clase III esquelética"}},
  {id:"SNPP",name:"SN.PP",description:"Inclinación del plano palatino",norm:8,sd:3,lines:["SN","PP"],points:["S","N","ENP","ENA"],center:P.S!,d1:v(P.S!,P.N!),d2:v(P.ENP!,P.ENA!),radius:125,side:"L",y:40,ghost:2,interpretations:{ok:"Plano palatino normal",hi:"Rotación horaria del plano palatino",lo:"Rotación antihoraria del plano palatino"}},
  {id:"SNGn",name:"SN.Gn",description:"Dirección de crecimiento",norm:67,sd:3,lines:["SN","SGn"],points:["S","N","Gn"],center:P.S!,d1:v(P.S!,P.N!),d2:v(P.S!,P.Gn!),radius:58,side:"L",y:118,interpretations:{ok:"Crecimiento equilibrado",hi:"Tendencia vertical",lo:"Tendencia horizontal"}},
  {id:"EF",name:"Eje facial",description:"Eje facial de Ricketts",norm:90,sd:3,lines:["BaN","PtGn"],points:["Ba","N","Pt","Gn"],center:[269,350],d1:v(P.N!,P.Ba!),d2:v(P.Pt!,P.Gn!),radius:42,side:"L",y:238,interpretations:{ok:"Mesofacial",hi:"Tendencia braquifacial",lo:"Tendencia dolicofacial"}},
  {id:"SNPloc",name:"SN.Ploc",description:"Inclinación plano oclusal",norm:14,sd:4,lines:["SN","Ploc"],points:["S","N"],center:[300,456],d1:v(P.S!,P.N!),d2:v(PLANES.Ploc![0],PLANES.Ploc![1]),radius:95,side:"R",y:420,ghost:1,interpretations:{ok:"Plano oclusal normal",hi:"Plano oclusal más inclinado",lo:"Plano oclusal aplanado"}},
  {id:"PPGoGn",name:"PP.GoGn",description:"Divergencia maxilomandibular",norm:25,sd:5,lines:["PP","GoGn"],points:["ENP","ENA","Go","Gn"],center:P.Go!,d1:v(P.ENP!,P.ENA!),d2:v(P.Go!,P.Gn!),radius:112,side:"L",y:500,ghost:1,interpretations:{ok:"Divergencia normal",hi:"Hiperdivergencia",lo:"Hipodivergencia"}},
  {id:"SNGoGn",name:"SN.GoGn",description:"Plano mandibular",norm:32,sd:5,lines:["SN","GoGn"],points:["S","N","Go","Gn"],center:P.Go!,d1:v(P.S!,P.N!),d2:v(P.Go!,P.Gn!),radius:165,side:"L",y:584,ghost:1,interpretations:{ok:"Normodivergente",hi:"Hiperdivergente",lo:"Hipodivergente"}},
];
export const EXAMPLE_VALUES: Record<string,string>={SNA:"84",SNB:"78",ANB:"6",SNPP:"7",SNGn:"70",EF:"86",SNPloc:"17",PPGoGn:"28",SNGoGn:"37"};
const POINT_LABEL_OFFSETS:Record<string,Point>={N:[-30,-10],S:[-8,-14],S1:[-20,28],Pt:[12,-6],ENP:[-48,-12],ENA:[10,-8],A:[13,8],B:[13,8],Pg:[13,8],Gn:[6,24],Me:[-38,14],Go:[-34,6],Ba:[-12,28]};
const unit=(p:Point):Point=>{const length=Math.hypot(...p)||1;return[p[0]/length,p[1]/length]};
function Angle({measurement:m,active,hasValue,status,onSelect,value}:{
  measurement:CephMeasurement;active:boolean;hasValue:boolean;status:string|null;
  value:string;onSelect:(id:string)=>void;
}){
  const a1=Math.atan2(m.d1[1],m.d1[0]),a2=Math.atan2(m.d2[1],m.d2[0]);
  let delta=a2-a1;while(delta>Math.PI)delta-=Math.PI*2;while(delta<=-Math.PI)delta+=Math.PI*2;
  const [cx,cy]=m.center,r=m.radius;
  const sx=cx+r*Math.cos(a1),sy=cy+r*Math.sin(a1),ex=cx+r*Math.cos(a2),ey=cy+r*Math.sin(a2);
  const mid=a1+delta/2, mx=cx+r*Math.cos(mid),my=cy+r*Math.sin(mid);
  const bx=m.side==="R"?650:-170,by=m.y,stroke=status==="ok"?"#16804a":status?"#dc7a28":active?"#2064c7":"#a4b0be";
  const ghost=unit(m.ghost===1?m.d1:m.d2);
  return <g opacity={active||hasValue?1:.55}>
    {m.ghost?<line x1={cx} y1={cy} x2={cx+ghost[0]*(r+90)} y2={cy+ghost[1]*(r+90)} stroke="#8fa0b3" strokeDasharray="5 5" />:null}
    <path d={`M${sx},${sy} A${r},${r} 0 0 ${delta>0?1:0} ${ex},${ey}`} stroke={active?"#2064c7":stroke} strokeWidth={active?3.5:2} fill="none"/>
    <line x1={bx+(m.side==="R"?0:152)} y1={by+30} x2={mx} y2={my} stroke={stroke} strokeWidth="1.4" markerEnd="url(#ceph-arrow)"/>
    <g role="button" tabIndex={0} aria-label={`Editar ${m.name}`} onClick={()=>onSelect(m.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(m.id)}}} className={styles.angleAction}>
      <rect x={bx} y={by} width="152" height="60" rx="8" fill="var(--mantine-color-body)" stroke={stroke} strokeWidth={active?3:1.5}/>
      <text x={bx+12} y={by+20} fontSize="15" fontWeight="600" fill="currentColor">{m.name}</text>
      <text x={bx+12} y={by+47} fontSize="23" fontWeight="600" fill="currentColor">{hasValue?`${value}°`:"— °"}</text>
    </g>
  </g>;
}
export function CephalometryDiagram({values,active,solo,onSelect,statuses}:{
  values:Record<string,string>;active:string|null;solo:boolean;onSelect:(id:string)=>void;
  statuses:Record<string,string|null>;
}){
  const selected=MEASURES.find(m=>m.id===active);
  const visible=(m:CephMeasurement)=>!solo||m.id===active;
  const referencedLines=new Set(selected?.lines??[]);
  const referencedPoints=new Set(selected?.points??[]);
  return <svg viewBox="-178 -6 994 760" role="img" aria-label="Trazado cefalométrico lateral con ángulos y puntos anatómicos" className={styles.diagramSvg}>
    <defs><marker id="ceph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#7c94b6"/></marker></defs>
    <g stroke="#7e8b97" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="35" cy="300" r="21"/>
            
            <path d="M535,7 C531,40 528,90 530,125 C532,160 540,182 556,200 C578,222 605,250 620,280 C630,300 632,318 624,330 C614,345 594,352 578,372 C572,385 574,398 582,410 C592,425 596,440 588,452 C580,462 566,470 556,477 C566,482 574,490 576,503 C578,516 570,522 560,528 C548,540 540,556 538,580 C536,610 535,632 524,652 C512,672 490,688 460,696 C420,704 380,700 340,704 C310,708 296,716 285,727"/>
            
            <path d="M509,50 C511,75 510,100 505,117"/>
            <path d="M505,117 C510,135 525,160 545,190 C525,172 498,160 480,150 C467,142 462,132 468,125 C478,119 494,121 505,117 Z"/>
            
            <path d="M400,130 C404,165 405,200 415,225 C425,248 445,250 468,226"/>
            
            <path d="M110,199 C114,190 118,182 122,180 C126,186 126,198 134,206 C142,214 158,212 164,204 C169,196 168,184 172,178 L285,110"/>
            <path d="M285,110 C277,140 274,158 268,172 C252,215 205,252 160,280 C120,305 88,335 65,374"/>
            <path d="M110,199 C106,240 92,285 65,374"/>
            
            <path d="M256,241 C249,241 245,249 245,262 C245,284 251,306 258,327 C260,305 264,282 266,262 C267,249 263,241 256,241 Z"/>
            
            <path d="M248,365 C300,360 380,355 434,349 Q446,346 448,330 Q451,345 464,346 C485,347 500,347 512,348"/>
            <path d="M248,366 C262,370 320,366 360,368 C390,372 410,384 425,398 C440,412 458,425 472,432"/>
            <path d="M512,348 C506,358 502,368 501,380 C502,395 505,408 509,422"/>
            
            <path d="M92,330 C104,338 110,350 112,370 C114,410 118,460 131,501 C140,520 150,530 165,537 C220,558 280,580 340,606 C370,620 400,645 424,665"/>
            <path d="M424,665 C430,675 440,679 450,677 C457,675 461,671 463,668 C469,662 473,655 474,646 C475,632 474,615 474,600 C475,585 479,570 483,558"/>
            <path d="M424,665 C418,650 416,628 420,605 C424,590 434,578 452,566"/>
            
            <path d="M462,360 C470,358 480,362 490,378 C500,395 510,415 520,440 C527,456 532,470 528,478 C522,482 512,478 500,470 C490,463 480,455 474,440 C468,425 465,405 460,385 C458,372 457,364 462,360 Z"/>
            <path d="M452,588 C452,570 458,555 463,543 C468,525 474,505 482,490 C487,480 491,474 497,471 C503,469 507,475 506,486 C505,505 500,520 494,530 C489,545 484,555 482,560 C475,570 462,580 452,588 Z"/>
            
            <path d="M318,368 C316,390 316,410 312,428 C305,436 302,446 306,456 C314,462 322,458 328,456 C334,462 344,464 350,458 C356,462 366,460 368,452 C370,442 366,432 360,426 C358,405 360,385 362,368 C356,368 352,372 350,376 L345,390 L340,376 C336,370 330,368 318,368 Z"/>
            <path d="M298,462 C304,455 316,456 322,463 C330,457 342,459 348,466 C356,460 366,461 368,467 C366,480 360,490 357,500 C354,520 352,540 345,565 C340,573 330,574 326,566 C325,548 330,532 322,520 C314,528 312,545 306,558 C302,566 292,566 288,556 C286,535 290,515 292,500 C294,485 296,472 298,462 Z"/>
    </g>
    {Object.entries(PLANES).map(([id,[a,b]])=><line key={id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={referencedLines.has(id)?"#2064c7":"#8c9baa"} strokeWidth={referencedLines.has(id)?2.7:1.2} strokeDasharray={referencedLines.has(id)?undefined:"5 5"}/>)}
    {MEASURES.filter(visible).map(m=><Angle key={m.id} measurement={m} active={active===m.id} hasValue={values[m.id]?.trim()!==""} value={values[m.id]??""} status={statuses[m.id]??null} onSelect={onSelect}/>)}
    {Object.entries(POINTS).map(([id,p])=>{const offset=POINT_LABEL_OFFSETS[id]??[10,10];const focus=referencedPoints.has(id);return <g key={id}>
      <circle cx={p[0]} cy={p[1]} r={focus?7:4} fill={focus?"#2064c7":"white"} stroke={focus?"#2064c7":"#516272"} strokeWidth="2"/>
      <text x={p[0]+offset[0]} y={p[1]+offset[1]} fontSize="17" fontWeight={focus?700:500} fill={focus?"#2064c7":"currentColor"}>{id}</text>
    </g>})}
  </svg>;
}
