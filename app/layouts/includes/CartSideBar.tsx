"use client";

import React from "react";

interface CartSideBarProps {
  handlePayClick: (cartItems: any) => void;
}

export const CartSideBar: React.FC<CartSideBarProps> = ({ handlePayClick }) => {
  // Заглушка для корзины без контекста
  const cart = {
    cartItems: []
  };

  const amountWithoutTax = cart?.cartItems?.reduce(
    (acc: number, item: any) => acc + item.quantity * item.price,
    0
  );

  const taxAmount = (amountWithoutTax * 0.0).toFixed(2);
  const totalAmount = (Number(amountWithoutTax) + Number(taxAmount)).toFixed(2);

  return (
    <>
      <div
        id="RightSideBar"
        className={`
          z-20 bg-[#272B43] pt-[10px] h-auto overflow-hidden p-[20px] rounded-2xl justify-center
          md:flex md:flex-col items-center 
          w-auto md:w-[320px] fixed top-[100px] right-5 pb-4
        `}
      >
        <section className="py-5 sm:py-7 mt-[20px] md:flex hidden">
          <div className="container w-auto md:w-300 mx-auto px-4">
            <h2 className="text-3xl font-semibold mb-2">Cart</h2>
          </div>
        </section>

        {/* Desktop view: vertical list with Pay button at the bottom */}
        <ul className="hidden md:flex flex-col mb-5">
          <li className="justify-between text-white mb-1">
            <span>Total:</span>
            <span className="text-[40C998]">
              {cart?.cartItems?.reduce(
                (acc: number, item: any) => acc + item.quantity,
                0
              )}{" "}
              (Tracks)
            </span>
          </li>
          <li className="justify-between text-gray-600 mb-1">
            <span>TAX:</span>
            <span>${taxAmount}</span>
          </li>
          <li className="text-lg font-bold border-t flex justify-between mt-3 pt-3">
            <span>Total price:</span> 
            <span>${totalAmount}</span>
          </li>
        </ul>

        {/* Pay button for desktop */}
        <a
          onClick={handlePayClick}
          className="hidden md:inline-block px-4 py-4 text-[14px] w-full text-center font-medium text-white bg-[#40C998] rounded-2xl mt-5 hover:bg-[#25BCA1] cursor-pointer"
        >
          Pay
        </a>

        {/* Mobile view: layout with total price and button fixed at the bottom */}
        <div className=" md:hidden fixed bottom-5 left-5 right-5 p-4 flex justify-between items-center bg-[#272B43] rounded-2xl shadow-xl">
          {/* Total Price on the left */}
          <span className="text-white">
            Total price: <span className="text-[40C998]">${totalAmount}</span>
          </span>
          {/* Pay button on the right */}
          <a
            onClick={handlePayClick}
            className="px-10 py-4 inline-block text-[14px] text-bold font-medium text-white bg-[#40C998] rounded-2xl hover:bg-[#25BCA1] cursor-pointer"
          >
            Pay
          </a>
        </div>
      </div>
    </>
  );
}
