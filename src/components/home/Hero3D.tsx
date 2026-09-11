"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshTransmissionMaterial, Float, Stars, Line, Html } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Activity, BrainCircuit, Building2, Pill, Stethoscope, HeartPulse } from "lucide-react";







function DNA({ position, rotation, scale, color1 = "#0ea5e9", color2 = "#10b981" }: any) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });

  const basePairs = 15;
  const height = 4;
  const radius = 0.6;

  return (
    <group position={position} rotation={rotation} scale={scale} ref={groupRef}>
      {Array.from({ length: basePairs }).map((_, i) => {
        const y = (i / basePairs - 0.5) * height;
        const angle = (i / basePairs) * Math.PI * 4; // 2 full turns

        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;

        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;

        return (
          <group key={i}>
            {/* Backbone 1 */}
            <mesh position={[x1, y, z1]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color={color1} emissive={color1} emissiveIntensity={0.5} />
            </mesh>
            {/* Backbone 2 */}
            <mesh position={[x2, y, z2]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color={color2} emissive={color2} emissiveIntensity={0.5} />
            </mesh>
            {/* Rung */}
            <mesh position={[0, y, 0]} rotation={[0, -angle, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, radius * 2]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function FloatingDNAs() {
  return (
    <group>
      <Float speed={2} rotationIntensity={2} floatIntensity={2}>
        <DNA position={[-8, 4, -5]} rotation={[Math.PI / 4, 0, 0]} scale={0.5} color1="#0ea5e9" color2="#38bdf8" />
      </Float>
      <Float speed={1.5} rotationIntensity={1.5} floatIntensity={2}>
        <DNA position={[8, -5, -8]} rotation={[-Math.PI / 4, Math.PI / 3, 0]} scale={0.4} color1="#10b981" color2="#34d399" />
      </Float>
      <Float speed={2.5} rotationIntensity={1} floatIntensity={3}>
        <DNA position={[-5, -4, -10]} rotation={[Math.PI / 3, Math.PI / 4, 0]} scale={0.6} color1="#6366f1" color2="#818cf8" />
      </Float>
      <Float speed={1.2} rotationIntensity={2} floatIntensity={1.5}>
        <DNA position={[6, 6, -12]} rotation={[-Math.PI / 6, -Math.PI / 4, 0]} scale={0.7} color1="#f59e0b" color2="#fbbf24" />
      </Float>

      {/* New added DNA strands */}
      <Float speed={2.2} rotationIntensity={1.8} floatIntensity={2}>
        <DNA position={[-2, 7, -8]} rotation={[Math.PI / 2, Math.PI / 6, 0]} scale={0.45} color1="#ef4444" color2="#f87171" />
      </Float>
      <Float speed={1.8} rotationIntensity={2.5} floatIntensity={1.2}>
        <DNA position={[10, 2, -6]} rotation={[-Math.PI / 3, Math.PI / 2, 0]} scale={0.55} color1="#2563eb" color2="#60a5fa" />
      </Float>
      <Float speed={1.5} rotationIntensity={1.2} floatIntensity={2.5}>
        <DNA position={[-9, -2, -7]} rotation={[Math.PI / 5, -Math.PI / 3, 0]} scale={0.65} color1="#eab308" color2="#fde047" />
      </Float>
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <DNA position={[3, -7, -9]} rotation={[Math.PI / 4, Math.PI / 5, 0]} scale={0.5} color1="#ef4444" color2="#fbbf24" />
      </Float>
    </group>
  );
}

export function Hero3D() {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#0ea5e9" />


        {/* Floating Background DNA Strands */}
        <FloatingDNAs />

        {/* Environment Particles */}
        <Stars radius={20} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.2}
          maxPolarAngle={Math.PI / 2 + 0.3}
          minPolarAngle={Math.PI / 2 - 0.3}
        />
      </Canvas>
    </div>
  );
}
