"use client"

import { useGeneralStore } from "../stores/general";
import Login from "./auth/Login";
import Register from "./auth/Register";
import EditProfileOverlay from "./profile/EditProfileOverlay";
import ClientOnly from "./ClientOnly";
import { AnimatePresence } from "framer-motion";
//import { RecoilRoot } from "recoil";

export default function AllOverlays() {
    const { isLoginOpen, isRegisterOpen, isEditProfileOpen } = useGeneralStore();
    
    return (
        <ClientOnly>
            <AnimatePresence>
                {isLoginOpen && <Login />}
                {isRegisterOpen && <Register />}
                {isEditProfileOpen && <EditProfileOverlay />}
            </AnimatePresence>
        </ClientOnly>
    );
}
