import type { Metadata, Viewport } from "next";
import "./globals.css";
import {NativeProviders} from "../components/native/NativeProviders";
export const metadata:Metadata={title:"Denty",description:"Gestión clínica dental"};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f7fafc"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body><NativeProviders>{children}</NativeProviders></body></html>}
