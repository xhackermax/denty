"use client";

import Link from "next/link";
import {useParams} from "next/navigation";

function BackIcon(){return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6"/></svg>}

export default function PatientGamesPage(){
  const {patientId}=useParams<{patientId:string}>();
  return <main className="native-denty patient-games-portal motion-page">
    <div className="patient-games-portal-shell">
      <header className="patient-games-portal-header">
        <Link className="patient-games-back" href={`/patient/${patientId}`} aria-label="Volver a Mi zona"><BackIcon/><span>Mi zona</span></Link>
        <div className="patient-games-portal-heading"><small>Denty Paciente</small><h1>Juegos</h1><p>Partidas rápidas, siempre dentro de tu zona.</p></div>
      </header>
      <section className="patient-games-portal-card" aria-label="Denty Games" data-motion-reveal>
        <iframe className="patient-games-portal-frame" src={`/games/index.html?patientId=${encodeURIComponent(patientId)}`} title="Denty Games" sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer"/>
      </section>
    </div>
  </main>;
}
