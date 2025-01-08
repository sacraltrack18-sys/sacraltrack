"use client";

import { useContext, useEffect, useState, useRef } from "react";
import CartContext from "@/app/context/CartContext";
import TopNav from "@/app/layouts/includes/TopNav";
import { CartSideBar } from "@/app/layouts/includes/CartSideBar";
import { PostMainCompTypes } from "@/app/types";
import useCreateBucketUrl from "@/app/hooks/useCreateBucketUrl";
import { CartItem } from "@/app/types";
import getStripe from "@/libs/getStripe";
import toast from 'react-hot-toast';
import { useUser } from "@/app/context/user";

import Link from "next/link";
import { BsFillPlayFill, BsFillStopFill } from 'react-icons/bs';
import Player from '@/app/components/Player'; // Import the Player component
import Preloader from "@/app/components/Preloader";

const Cart: React.FC<{ post: PostMainCompTypes | null }> = ({ post = null }) => {
    // Contexts
    const { deleteItemFromCart, cart } = useContext(CartContext);
    const cartItems = cart?.cartItems || [];
    const user = useUser();
    

    // States
    const [loading, setLoading] = useState(true);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null); // Track hovered index

    // Refs for managing cursor interaction
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]); // осталось пустым до заполнения

    // Effects
    useEffect(() => {
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timeout);
    }, []);

    // Functionality to handle playback state
    const handlePlayPause = (index: number) => {
        if (playingIndex === index) {
            setPlayingIndex(null); // Pause if already playing
        } else {
            setPlayingIndex(index); // Set this index as currently playing
        }
    };

    // Handlers STRIPE
    const createCheckoutSession = async (cartItems: CartItem[], userId?: string) => {
        try {
            const stripe = await getStripe();
            const response = await fetch("/api/checkout_sessions/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest"
                },
                cache: "no-cache",
                body: JSON.stringify({ cartItems, userId }),
            });

            if (response.status === 404) {
                throw new Error("Resource not found");
            }

            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data.session) {
                    stripe?.redirectToCheckout({ sessionId: data.session.id });
                }
            } else {
                throw new Error("Response is not valid JSON");
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
        }
    };

    const userContext = useUser();

    // Conditional Rendering based on 'loading' and 'cartItems'
    if (loading) {
        return <Preloader />;
    }

    if (!cart?.cartItems.length) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="text-white text-2xl font-bold mb-4">Your cart is empty.</div>
                <Link href="/" className="bg-[#20DDBB] text-white px-6 py-3 rounded-2xl hover:bg-[#21C3A6]">
                    Go to Home Page
                </Link>
            </div>
        );
    }  

    // Функция для установки курсора при наведении
    const handleMouseOver = (index: number) => {
        const imageRef = imageRefs.current[index];
        if (imageRef) {
            imageRef.style.cursor = playingIndex === index ? "url('/images/pause-icon.svg'), auto" : "url('/images/play-icon.svg'), auto";
        }
    };
 // Функция для сброса курсора
 const handleMouseOut = (index: number) => {
    const imageRef = imageRefs.current[index];
    if (imageRef) {
        imageRef.style.cursor = "default";
    }
};


    return (
        <>
            <TopNav params={{ id: userContext?.user?.id as string }} />
            <div className="px-[20px]">
                <CartSideBar handlePayClick={() => createCheckoutSession(cartItems, userContext?.user?.id)} />
                {/* Card */}
                <div className="justify-center pt-[100px] mx-auto w-full h-screen items-center md:w-auto">
                    {cart.cartItems.map((cartItem: CartItem, index: number) => (
                            <div
                            key={index}
                            ref={el => imageRefs.current[index] = el} // Set the ref for each item
                            className="relative md:w-[620px] w-full h-[500px] bg-cover bg-center rounded-2xl mb-5 pt-2 p-2"
                            style={{
                                backgroundImage: `url(${useCreateBucketUrl(cartItem.image)})`
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div className="bg-[#272B43]/90 shadow-[0px_5px_5px_-10px_rgba(0,0,0,0.5)] w-full h-[54px] flex items-center rounded-xl">
                                <div className="cursor-pointer">
                                    {/* Placeholder for an image (e.g., profile image) */}
                                    {/* <img className="rounded-[15px] max-h-[50px] w-[50px]" src={useCreateBucketUrl(post?.profile?.image)} /> */}
                                </div>

                                <a href="#" className="hover:text-blue-600 text-white ml-2 text-[14px]">
                                    {cartItem.name}
                                </a>

                                <div className="pl-3 w-full px-2">
                                    <div className="flex items-center justify-between pb-0.5">
                                        {post && post.profile && (
                                            <Link href={`/profile/${post.profile.user_id}`} className="text-[#818BAC] size-[15px]">
                                                <span className="font-bold hover:underline cursor-pointer">
                                                    {post.profile.name}
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                    <p className="text-[14px] pb-0.5 break-words md:max-w-[400px] max-w-[240px]">{post?.trackname}</p>
                                </div>

                                <p className="font-semibold not-italic mt-0">
                                    ${cartItem.price * cartItem.quantity}
                                </p>

                                {/* Delete Button */}
                                <button
                                    onClick={() => {
                                        deleteItemFromCart(cartItem?.product);
                                    }}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <img src="/images/del.svg" className="h-[16px] w-[16px] mr-2" alt="Delete" />
                                </button>
                            </div>

                           {/* Player and WaveSurfer */}

                    <div className="flex items-center absolute bottom-24 w-full left-0 right-0 z-10 opacity-90">
                    {/* Button to the left of the waveform */}
                    <button
                        className="ml-4 mb-1 text-white rounded p-2"
                        onClick={() => handlePlayPause(index)}
                    >
                        {playingIndex === index ? (
                        <img src="/images/pause-icon.svg" className="h-[50px] w-[50px]" alt="Pause" />
                        ) : (
                        <img src="/images/play-icon.svg" className="h-[50px] w-[50px]" alt="Play" />
                        )}
                    </button>

                    {/* Place the Player component here */}
                    <div className="flex-grow mx-4"> {/* Добавление.flex-grow для растяжения на всю ширину */}
                        <Player
                        audioUrl={useCreateBucketUrl(cartItem.audio)}
                        isPlaying={playingIndex === index}
                        onPlay={() => console.log('Playing')}
                        onPause={() => console.log('Paused')}
                        />
                    </div>
                    </div>



                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default Cart;
