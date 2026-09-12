"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Stars } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function DNA({ position, rotation, scale, color1 = "#0ea5e9", color2 = "#10b981" }: any) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.3;
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  const basePairs = 40;
  const height = 14;
  const radius = 1.5;

  return (
    <group position={position} rotation={rotation} scale={scale} ref={groupRef}>
      {Array.from({ length: basePairs }).map((_, i) => {
        const y = (i / basePairs - 0.5) * height;
        const angle = (i / basePairs) * Math.PI * 8; // 4 full turns

        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;

        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;

        return (
          <group key={i}>
            {/* Backbone 1 */}
            <mesh position={[x1, y, z1]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color={color1} emissive={color1} emissiveIntensity={0.6} />
            </mesh>
            {/* Backbone 2 */}
            <mesh position={[x2, y, z2]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color={color2} emissive={color2} emissiveIntensity={0.6} />
            </mesh>
            {/* Rung */}
            <mesh position={[0, y, 0]} rotation={[0, -angle, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, radius * 2]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Diagnostics3D() {
  return (
    <div className="w-full h-full absolute inset-0 opacity-30 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#2dd4bf" />
        
        {/* Large DNA on the right side */}
        <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
          <DNA position={[6, 0, -3]} rotation={[Math.PI / 12, 0, -Math.PI / 12]} scale={1} color1="#2dd4bf" color2="#3b82f6" />
        </Float>
        
        {/* Smaller DNA on the left side */}
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
          <DNA position={[-8, 2, -6]} rotation={[-Math.PI / 8, 0, Math.PI / 8]} scale={0.6} color1="#10b981" color2="#6366f1" />
        </Float>
        
        {/* Tiny DNA in the background */}
        <Float speed={1.2} rotationIntensity={2} floatIntensity={1}>
          <DNA position={[-3, -4, -10]} rotation={[Math.PI / 6, Math.PI / 4, 0]} scale={0.4} color1="#a855f7" color2="#ec4899" />
        </Float>

        <Stars radius={20} depth={50} count={1000} factor={3} saturation={0} fade speed={1} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>
    </div>
  );
}
