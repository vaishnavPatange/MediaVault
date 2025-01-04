import React from 'react'

function Button({
    children,
    type="button",
    bgColor="bg-[#202c3c]",
    textColor="text-white",
    className="",
    ...props

}) {
  return (
    <button className={`px-4 py-2 rounded-lg ${textColor} ${bgColor} ${className}`}
        type={type}
        {...props}
    >
      {children}
    </button>
  )
}

export default Button
