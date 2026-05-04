"use client";

import s from "./Logo.module.css";

interface Props {
  className?: string;
}

export function Logo({ className }: Props) {
  return (
    <span className={`${s.root} ${className ?? ""}`}>
E<span className={s.pi}>π</span>isteme<span className={s.bot}>Bot</span>
    </span>
  );
}
