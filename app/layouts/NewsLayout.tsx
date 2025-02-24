import React, { useState, useEffect } from 'react';
import SideNavMain from "./includes/SideNavMain"
import TopNav from "./includes/TopNav"
import { usePathname } from "next/navigation"
import MainComponentsFilter from "./includes/MainComponentsFilter"
import { motion, Variants } from 'framer-motion';
import Preloader from "../components/Preloader"
//import { RecoilRoot } from "recoil";
import { useUser } from "@/app/context/user";
import Banner from "../components/ads/Banner";





export default function NewsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const userContext = useUser();   
    
	{/*Preloader*/}
	const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const login = useUser();


    useEffect(() => {
        const timeout = setTimeout(() => {
            setLoading(false);

            // Показываем модальное окно, если пользователь не залогинен
            if (!userContext?.user) {
                setIsModalVisible(true);
            }
        }, 1000);

        return () => clearTimeout(timeout);
    }, [userContext]);

    const closeModal = () => {
        setIsModalVisible(false);
    };


    return (
		<>

		  {loading ? (
                <Preloader />
            ) : (
                <>
		     <TopNav params={{ id: userContext?.user?.id as string }} />

		
		    <div className="flex  mx-auto w-full px-0">
			
			<div className="flex justify-start  w-auto md:w-300 px-0">
			<motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                      className="md:flex justify-start  w-auto md:w-300 px-0"

            >


				{/*<SideNavMain />*/}
				{/*<MainComponentsFilter />*/}
				</motion.div>
			</div>


			<div className="flex justify-center w-full p-20  px-0">
			<motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex justify-center px-0"
            >

				{children}

			</motion.div>
			</div>

			<div className="hidden sm:block md:flex justify-end w-[300px] pr-[20px]">

			<motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className=" md:flex justify-end  w-[300px] "
            >
            {/*section*/} 
            
            </motion.div>
                
			</div>



                {/* Круглая кнопка "Support" */}
                <motion.a
                            href="http://t.me/sashaplayra"
                            target="_blank"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="fixed bottom-5 right-5 bg-[#272B43] text-white rounded-full w-20 h-20 flex items-center justify-center cursor-pointer hover:bg-[#1E2136] focus:outline-none"
                        >   <div className="flex flex-col items-center">
                                <img src="/images/tel.svg" className="w-4 h-4 mb-1" alt="" />
                                <span className="text-[10px]">Support</span>
                            </div>
                    
                </motion.a>

		</div>
		</>
            )}
       
	</>
    )
}


