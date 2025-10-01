import { ChangeEventHandler, FocusEventHandler } from "react";

interface TextInputProps {
    string: string;
    placeholder?: string;
    inputType?: string;
    error?: string;
    onUpdate: (value: string) => void;
    className?: string;
}

export default function TextInput({ string, placeholder, inputType = "text", error, onUpdate, className }: TextInputProps) {
    return (
        <input
            type={inputType}
            value={string}
            placeholder={placeholder}
            className={`
                ${className}
                bg-[#14151F]/60 
                text-white 
                placeholder-[#818BAC]/50
                focus:outline-none
                focus:ring-0
                focus:border-[#20DDBB]
                transition-all
                duration-300
            `}
            onChange={(e) => onUpdate(e.target.value)}
        />
    );
}