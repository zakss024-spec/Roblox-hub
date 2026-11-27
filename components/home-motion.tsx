"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HomeMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useGSAP(() => {
    if (reduceMotion) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .fromTo(".hero-copy .eyebrow", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45 })
        .fromTo(".hero-copy h1", { y: 34, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.72 }, "-=0.2")
        .fromTo(".hero-description", { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, "-=0.35")
        .fromTo(".hero-buttons", { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45 }, "-=0.28")
        .fromTo(".hero-footnote", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, "-=0.2");

      gsap.fromTo(".hero-art", { autoAlpha: 0, scale: 0.92, rotate: 2 }, {
        autoAlpha: 1,
        scale: 1,
        rotate: 0,
        duration: 0.9,
        ease: "back.out(1.2)",
        delay: 0.15,
      });

      gsap.utils.toArray<HTMLElement>(".pillar, .hub-destination-card").forEach((card) => {
        gsap.fromTo(card, { y: 28, autoAlpha: 0 }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true,
          },
        });
      });

      gsap.fromTo(".owner-strip .owner-copy, .owner-strip .owner-cta", { y: 20, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: ".owner-strip", start: "top 82%", once: true },
      });
    });

    return () => media.revert();
  }, { scope: root, dependencies: [reduceMotion], revertOnUpdate: true });

  return (
    <motion.div
      ref={root}
      className="hub-motion-root"
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
