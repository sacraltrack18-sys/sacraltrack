import React, { useEffect } from "react";
import SideNavMain from "./includes/SideNavMain"
import TopNav from "./includes/TopNav"
import { usePathname } from "next/navigation"
import RightSideBar from "./includes/RightSideBar"
import ProfileComponents from "./includes/ProfileComponents"
import { ProfilePageTypes } from "../types"
import { RecoilRoot } from "recoil"
import { useUser } from "@/app/context/user";
import '@/app/globals.css';






export default function ProfileLayout({ children, params }: { children: React.ReactNode, params: ProfilePageTypes }) {

    const pathname = usePathname()

	const userContext = useUser();   
	
				


    return (
		<>
		<RecoilRoot>
		<TopNav params={{ id: userContext?.user?.id as string }} />
		
		<div className="flex justify-between mx-auto w-full px-5">
			
				
				<SideNavMain params={params.params} />
		
                <ProfileComponents  />
            
				<div className="flex justify-end w-full">
				{children}
			</div>
			{/* <div className="hidden md:flex justify-end bg-[#15191F] w-[300px] md:pr-[20px]">

    			 <RightSideBar /> 
			</div>*/} 
		</div>
		</RecoilRoot>
	</>
    )
}


