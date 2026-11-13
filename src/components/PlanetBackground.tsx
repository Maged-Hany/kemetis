import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GravityMode } from '../types/health';

interface PlanetBackgroundProps {
  gravity: GravityMode;
}

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = `
  uniform vec3 glowColor;
  uniform float intensity;
  varying vec3 vNormal;
  void main() {
    float rim = pow(0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
    gl_FragColor = vec4(glowColor, clamp(rim * intensity, 0.0, 0.85));
  }
`;

export function PlanetBackground({ gravity }: PlanetBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gravityRef = useRef<GravityMode>(gravity);
  gravityRef.current = gravity;

  const sceneRefs = useRef<{
    applyMode?: (mode: GravityMode) => void;
  }>({});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );
    camera.position.set(0.95, 0.12, 3.35);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.12);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xfff7ea, 2.6);
    sunLight.position.set(-3.8, 1.6, 2.8);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x6b93d6, 0.45);
    rimLight.position.set(3.2, -1.8, -2.2);
    scene.add(rimLight);

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 18 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi) - 8;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const group = new THREE.Group();
    group.position.set(0.95, -0.05, 0);
    group.rotation.z = THREE.MathUtils.degToRad(23.4);
    scene.add(group);

    const loader = new THREE.TextureLoader();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const loadTex = (url: string, srgb = true) => {
      const t = loader.load(url);
      t.anisotropy = maxAniso;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    const earthMap = loadTex('/textures/earth_atmos_2048.jpg', true);
    const earthNormal = loadTex('/textures/earth_normal_2048.jpg', false);
    const earthSpec = loadTex('/textures/earth_specular_2048.jpg', false);
    const earthCloudsTex = loadTex('/textures/earth_clouds_1024.png', true);
    const moonMap = loadTex('/textures/moon_1024.jpg', true);
    const marsMap = loadTex('/textures/marsmap1k.jpg', true);
    const marsBump = loadTex('/textures/marsbump1k.jpg', false);

    const sphereGeo = new THREE.SphereGeometry(1.18, 96, 96);
    const planetMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      normalMap: earthNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      specularMap: earthSpec,
      specular: new THREE.Color(0x2a3b52),
      shininess: 18,
    });
    const planetMesh = new THREE.Mesh(sphereGeo, planetMat);
    group.add(planetMesh);

    const cloudsGeo = new THREE.SphereGeometry(1.196, 72, 72);
    const cloudsMat = new THREE.MeshLambertMaterial({
      map: earthCloudsTex,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    group.add(cloudsMesh);

    const atmosGeo = new THREE.SphereGeometry(1.31, 72, 72);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      uniforms: {
        glowColor: { value: new THREE.Color(0x4ea2ff) },
        intensity: { value: 0.9 },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    group.add(atmosMesh);

    const targetCamPos = new THREE.Vector3(0.45, 0.08, 3.15);
    const targetGroupPos = new THREE.Vector3(0.92, -0.04, 0);
    let targetScale = 1;

    const applyMode = (mode: GravityMode) => {
      if (mode === '0.16g') {
        planetMat.map = moonMap;
        planetMat.normalMap = null;
        planetMat.specularMap = null;
        planetMat.bumpMap = moonMap;
        planetMat.bumpScale = 0.018;
        planetMat.specular.setHex(0x050505);
        planetMat.shininess = 4;
        cloudsMesh.visible = false;
        atmosMat.uniforms.glowColor.value.setHex(0xd8dde6);
        atmosMat.uniforms.intensity.value = 0.18;
        group.rotation.z = THREE.MathUtils.degToRad(6.7);
        targetScale = 0.92;
        targetGroupPos.set(0.88, 0.02, 0);
        targetCamPos.set(0.32, 0.04, 3.1);
      } else if (mode === '0.38g') {
        planetMat.map = marsMap;
        planetMat.normalMap = null;
        planetMat.specularMap = null;
        planetMat.bumpMap = marsBump;
        planetMat.bumpScale = 0.028;
        planetMat.specular.setHex(0x120905);
        planetMat.shininess = 6;
        cloudsMesh.visible = false;
        atmosMat.uniforms.glowColor.value.setHex(0xd96b38);
        atmosMat.uniforms.intensity.value = 0.52;
        group.rotation.z = THREE.MathUtils.degToRad(25.2);
        targetScale = 0.98;
        targetGroupPos.set(0.9, -0.02, 0);
        targetCamPos.set(0.35, 0.05, 3.12);
      } else if (mode === '0g') {
        planetMat.map = earthMap;
        planetMat.normalMap = earthNormal;
        planetMat.specularMap = earthSpec;
        planetMat.bumpMap = null;
        planetMat.specular.setHex(0x2a3b52);
        planetMat.shininess = 18;
        cloudsMesh.visible = true;
        atmosMat.uniforms.glowColor.value.setHex(0x4ea2ff);
        atmosMat.uniforms.intensity.value = 0.95;
        group.rotation.z = THREE.MathUtils.degToRad(23.4);
        targetScale = 1.26;
        targetGroupPos.set(1.18, -0.42, 0.25);
        targetCamPos.set(0.4, -0.05, 2.85);
      } else {
        planetMat.map = earthMap;
        planetMat.normalMap = earthNormal;
        planetMat.specularMap = earthSpec;
        planetMat.bumpMap = null;
        planetMat.specular.setHex(0x2a3b52);
        planetMat.shininess = 18;
        cloudsMesh.visible = true;
        atmosMat.uniforms.glowColor.value.setHex(0x4ea2ff);
        atmosMat.uniforms.intensity.value = 0.85;
        group.rotation.z = THREE.MathUtils.degToRad(23.4);
        targetScale = 1.02;
        targetGroupPos.set(0.92, -0.02, 0);
        targetCamPos.set(0.35, 0.05, 3.15);
      }
      planetMat.needsUpdate = true;
    };

    sceneRefs.current.applyMode = applyMode;
    applyMode(gravityRef.current);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const animateLoop = () => {
      raf = requestAnimationFrame(animateLoop);
      const dt = Math.min(clock.getDelta(), 0.05);
      planetMesh.rotation.y += dt * 0.085;
      cloudsMesh.rotation.y += dt * 0.115;
      stars.rotation.y += dt * 0.006;

      group.position.lerp(targetGroupPos, 0.05);
      camera.position.lerp(targetCamPos, 0.05);
      const s = THREE.MathUtils.lerp(group.scale.x, targetScale, 0.05);
      group.scale.setScalar(s);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animateLoop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      sphereGeo.dispose();
      cloudsGeo.dispose();
      atmosGeo.dispose();
      starsGeo.dispose();
      planetMat.dispose();
      cloudsMat.dispose();
      atmosMat.dispose();
      starsMat.dispose();
      earthMap.dispose();
      earthNormal.dispose();
      earthSpec.dispose();
      earthCloudsTex.dispose();
      moonMap.dispose();
      marsMap.dispose();
      marsBump.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    sceneRefs.current.applyMode?.(gravity);
  }, [gravity]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div ref={mountRef} className="h-full w-full opacity-75" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,transparent_12%,rgba(0,0,0,0.68)_58%,#000000_92%)]" />
    </div>
  );
}
