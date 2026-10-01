'use client'

import { Suspense, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { Html, Line, MeshDistortMaterial, Sparkles } from '@react-three/drei'
import type * as THREE from 'three'

export interface OrbitTrapNode {
  id: string
  label: string
  color: string
  icon: ReactNode
}

interface MindTrapOrbit3DProps {
  traps: OrbitTrapNode[]
  reducedMotion?: boolean
}

const ORBIT_RADIUS = 3.15
const ORBIT_SPEED = 0.16

/** Rotates a point on the XZ circle up out of plane by `tilt` radians (around the X axis). */
function tiltedOrbitPosition(angle: number, radius: number, tilt: number): [number, number, number] {
  const lx = Math.cos(angle) * radius
  const lz = Math.sin(angle) * radius
  const y = lz * Math.sin(tilt)
  const z = lz * Math.cos(tilt)
  return [lx, y, z]
}

/** Central glowing "brain" — two stylised hemispheres + brainstem, standing in for the flat icon. */
function BrainCore({ spin = true }: { spin?: boolean }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state: RootState, delta: number) => {
    if (!spin || !groupRef.current) return
    groupRef.current.rotation.y += delta * 0.12
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05
  })

  return (
    <group ref={groupRef}>
      {/* Left hemisphere */}
      <mesh position={[-0.34, 0.06, 0]} rotation={[0, 0, -0.18]}>
        <sphereGeometry args={[0.72, 48, 48]} />
        <MeshDistortMaterial
          color="#0d3946"
          emissive="#7fe9ff"
          emissiveIntensity={0.55}
          roughness={0.35}
          metalness={0.25}
          distort={spin ? 0.3 : 0}
          speed={1.4}
        />
      </mesh>
      {/* Right hemisphere */}
      <mesh position={[0.34, 0.06, 0]} rotation={[0, 0, 0.18]}>
        <sphereGeometry args={[0.72, 48, 48]} />
        <MeshDistortMaterial
          color="#0d3946"
          emissive="#7fe9ff"
          emissiveIntensity={0.55}
          roughness={0.35}
          metalness={0.25}
          distort={spin ? 0.3 : 0}
          speed={1.55}
        />
      </mesh>
      {/* Brainstem */}
      <mesh position={[0, -0.78, -0.02]}>
        <cylinderGeometry args={[0.13, 0.19, 0.46, 16]} />
        <meshStandardMaterial color="#0a2530" emissive="#4fb8d6" emissiveIntensity={0.4} roughness={0.45} />
      </mesh>
      {/* Faint neural wireframe halo */}
      <mesh scale={1.05}>
        <sphereGeometry args={[0.85, 16, 12]} />
        <meshBasicMaterial color="#7fe9ff" wireframe transparent opacity={0.12} />
      </mesh>
      <pointLight color="#7fe9ff" intensity={2.2} distance={4.5} />
    </group>
  )
}

/** The faint elliptical path a trap node travels along, so the motion reads as an orbit. */
function OrbitPath({ tilt, color }: { tilt: number; color: string }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    const segments = 80
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      pts.push(tiltedOrbitPosition(angle, ORBIT_RADIUS, tilt))
    }
    return pts
  }, [tilt])

  return <Line points={points} color={color} transparent opacity={0.16} lineWidth={1} />
}

/** One trap node orbiting the core along a fixed tilted ellipse (real 3D depth per node). */
function OrbitNode({
  trap,
  index,
  total,
  reducedMotion,
}: {
  trap: OrbitTrapNode
  index: number
  total: number
  reducedMotion: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const angleOffset = (index / total) * Math.PI * 2
  const tilt = ((index % 2 === 0 ? 1 : -1) * (0.3 + (index % 3) * 0.1)) as number

  useFrame((state: RootState) => {
    if (!groupRef.current) return
    const angle = reducedMotion ? angleOffset : state.clock.elapsedTime * ORBIT_SPEED + angleOffset
    groupRef.current.position.set(...tiltedOrbitPosition(angle, ORBIT_RADIUS, tilt))
  })

  return (
    <>
      <OrbitPath tilt={tilt} color={trap.color} />
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial
            color={trap.color}
            emissive={trap.color}
            emissiveIntensity={0.55}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
        <pointLight color={trap.color} intensity={0.8} distance={1.6} />
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }} occlude={false}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: trap.color,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.02em',
              textAlign: 'center',
              width: 112,
              whiteSpace: 'nowrap',
              textShadow: '0 2px 10px rgba(0,0,0,0.75)',
            }}
          >
            <span style={{ display: 'flex' }}>{trap.icon}</span>
            <span>{trap.label}</span>
          </div>
        </Html>
      </group>
    </>
  )
}

function Scene({ traps, reducedMotion }: { traps: OrbitTrapNode[]; reducedMotion: boolean }) {
  return (
    <group>
      <BrainCore spin={!reducedMotion} />
      {traps.map((trap, i) => (
        <OrbitNode key={trap.id} trap={trap} index={i} total={traps.length} reducedMotion={reducedMotion} />
      ))}
      {!reducedMotion && <Sparkles count={40} scale={6.2} size={1.6} speed={0.25} color="#7fe9ff" opacity={0.3} />}
    </group>
  )
}

export default function MindTrapOrbit3D({ traps, reducedMotion = false }: MindTrapOrbit3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.3, 7.4], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={0.55} color="#dfe8f0" />
      <Suspense fallback={null}>
        <Scene traps={traps} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  )
}
