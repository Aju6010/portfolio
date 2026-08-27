/**
 * ==========================================================================
 * AJU ELDO — DATA SCIENCE & AI PORTFOLIO
 * Dynamic Visitor Color Switcher, Subtle 3D Three.js Engine & UI Logic
 * ==========================================================================
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. COLOR ACCENT & THEME MANAGER
     ========================================================================== */
  const accentColors = {
    emerald: { hex: 0x10B981, rgb: '16, 185, 129' },
    cyan:    { hex: 0x0EA5E9, rgb: '14, 165, 233' },
    violet:  { hex: 0x8B5CF6, rgb: '139, 92, 246' },
    amber:   { hex: 0xF59E0B, rgb: '245, 158, 11' },
    rose:    { hex: 0xF43F5E, rgb: '244, 63, 94' }
  };

  const state = {
    theme: localStorage.getItem('theme') || 'dark',
    accent: localStorage.getItem('accent') || 'emerald',
    mouse: { x: 0, y: 0, nx: 0, ny: 0 }
  };

  function setAccent(colorName) {
    if (!accentColors[colorName]) colorName = 'emerald';
    state.accent = colorName;
    document.documentElement.dataset.accent = colorName;
    localStorage.setItem('accent', colorName);

    // Update active dot in navbar
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.color === colorName);
    });

    // Update Three.js 3D particles & lines color
    updateThreeColors();
  }

  function setTheme(themeName) {
    state.theme = themeName;
    document.documentElement.dataset.theme = themeName;
    localStorage.setItem('theme', themeName);

    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = themeName === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    // Update Three.js fog
    if (scene) {
      scene.fog.color.setHex(themeName === 'dark' ? 0x0B0F17 : 0xF8FAFC);
    }
    updateThreeColors();
  }

  function initThemeAndColors() {
    setTheme(state.theme);
    setAccent(state.accent);

    // Color dot click events
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        setAccent(dot.dataset.color);
      });
    });

    // Theme toggle button
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
      });
    }
  }

  /* ==========================================================================
     2. SUBTLE 3D THREE.JS DATA FIELD BACKGROUND
     ========================================================================== */
  let scene, camera, renderer;
  let particles, lineSegments;
  let pPositions, pVelocities;
  const particleCount = 100;

  function createGlowDot() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function initThree() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || !window.THREE) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(state.theme === 'dark' ? 0x0B0F17 : 0xF8FAFC, 0.002);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 140;

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 4. Ambient Data Particles
    const pGeo = new THREE.BufferGeometry();
    pPositions = new Float32Array(particleCount * 3);
    pVelocities = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 300;
      const y = (Math.random() - 0.5) * 220;
      const z = (Math.random() - 0.5) * 160;

      pPositions[i * 3] = x;
      pPositions[i * 3 + 1] = y;
      pPositions[i * 3 + 2] = z;

      pVelocities.push({
        x: (Math.random() - 0.5) * 0.16,
        y: (Math.random() - 0.5) * 0.16,
        z: (Math.random() - 0.5) * 0.16
      });
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    const currentHex = accentColors[state.accent]?.hex || 0x10B981;
    const pMat = new THREE.PointsMaterial({
      size: 4.5,
      map: createGlowDot(),
      transparent: true,
      opacity: state.theme === 'dark' ? 0.75 : 0.45,
      color: new THREE.Color(currentHex),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // 5. Interconnecting Synapse Lines
    const maxConnections = particleCount * (particleCount - 1) / 2;
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(maxConnections * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));

    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(currentHex),
      transparent: true,
      opacity: state.theme === 'dark' ? 0.25 : 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    lineSegments = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineSegments);

    // 6. Listeners & Loop
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll, { passive: true });

    animate();
  }

  function updateThreeColors() {
    if (!particles || !lineSegments) return;
    const currentHex = accentColors[state.accent]?.hex || 0x10B981;
    const color = new THREE.Color(currentHex);

    particles.material.color = color;
    particles.material.opacity = state.theme === 'dark' ? 0.75 : 0.45;

    lineSegments.material.color = color;
    lineSegments.material.opacity = state.theme === 'dark' ? 0.25 : 0.12;
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  function onMouseMove(e) {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouse.ny = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const current = window.scrollY || h.scrollTop;
    const pct = max ? (current / max) * 100 : 0;
    
    const readProg = document.getElementById('readProg');
    if (readProg) readProg.style.width = pct + '%';
  }

  function animate() {
    requestAnimationFrame(animate);

    if (particles && lineSegments) {
      const pos = particles.geometry.attributes.position.array;
      const linePos = lineSegments.geometry.attributes.position.array;
      let lineIdx = 0;

      for (let i = 0; i < particleCount; i++) {
        pPositions[i * 3] += pVelocities[i].x;
        pPositions[i * 3 + 1] += pVelocities[i].y;
        pPositions[i * 3 + 2] += pVelocities[i].z;

        // Bounce back within bounds
        if (Math.abs(pPositions[i * 3]) > 150) pVelocities[i].x *= -1;
        if (Math.abs(pPositions[i * 3 + 1]) > 110) pVelocities[i].y *= -1;
        if (Math.abs(pPositions[i * 3 + 2]) > 80) pVelocities[i].z *= -1;

        pos[i * 3] = pPositions[i * 3];
        pos[i * 3 + 1] = pPositions[i * 3 + 1];
        pos[i * 3 + 2] = pPositions[i * 3 + 2];
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Connect nearby nodes
      const maxDist = 42;
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDist) {
            linePos[lineIdx++] = pos[i * 3];
            linePos[lineIdx++] = pos[i * 3 + 1];
            linePos[lineIdx++] = pos[i * 3 + 2];
            linePos[lineIdx++] = pos[j * 3];
            linePos[lineIdx++] = pos[j * 3 + 1];
            linePos[lineIdx++] = pos[j * 3 + 2];
          }
        }
      }

      lineSegments.geometry.setDrawRange(0, lineIdx / 3);
      lineSegments.geometry.attributes.position.needsUpdate = true;

      // Gentle camera parallax with mouse
      camera.position.x += ((state.mouse.nx * 12) - camera.position.x) * 0.04;
      camera.position.y += ((-state.mouse.ny * 10) - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  /* ==========================================================================
     3. TYPING ANIMATION
     ========================================================================== */
  const phrases = [
    'Aspiring Data Scientist',
    'AI / Machine Learning Engineer',
    'SAP Hackfest Top 10 Finalist',
    'Campus Lead @ MuLearn VJCET',
    'Bridging Data to Impact'
  ];

  let pIndex = 0, charIndex = 0, isDeleting = false;

  function typeEffect() {
    const typedEl = document.getElementById('typed');
    if (!typedEl) return;

    const currentPhrase = phrases[pIndex];

    if (!isDeleting) {
      typedEl.textContent = currentPhrase.slice(0, ++charIndex);
      if (charIndex === currentPhrase.length) {
        isDeleting = true;
        setTimeout(typeEffect, 2200);
        return;
      }
    } else {
      typedEl.textContent = currentPhrase.slice(0, --charIndex);
      if (charIndex === 0) {
        isDeleting = false;
        pIndex = (pIndex + 1) % phrases.length;
      }
    }

    setTimeout(typeEffect, isDeleting ? 35 : 75);
  }

  /* ==========================================================================
     4. INTERSECTION OBSERVERS (Fade-in & Skill Bars)
     ========================================================================== */
  function initObservers() {
    // 1. General Fade-in
    const fadeObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('v');
        }
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.fi').forEach(el => fadeObs.observe(el));

    // 2. Skill Bars Fill
    const skillObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.sb-fill').forEach(bar => {
            bar.style.width = bar.dataset.w + '%';
          });
        }
      });
    }, { threshold: 0.25 });

    document.querySelectorAll('.skill-category').forEach(el => skillObs.observe(el));
  }

  /* ==========================================================================
     5. LIVE GITHUB REPOSITORIES FETCH & MODAL
     ========================================================================== */
  async function loadGitHubRepos() {
    const container = document.getElementById('ghRepos');
    if (!container) return;

    try {
      const res = await fetch('https://api.github.com/users/Aju6010/repos?sort=updated&per_page=6');
      if (!res.ok) throw new Error('Status ' + res.status);
      const repos = await res.json();

      if (!Array.isArray(repos) || !repos.length) {
        container.innerHTML = '<p class="gh-loading-msg">No public repositories found.</p>';
        return;
      }

      container.innerHTML = '';
      repos.forEach(r => {
        const card = document.createElement('div');
        card.className = 'project-card clean-card';
        card.style.cursor = 'pointer';

        const lang = r.language || 'Python / Code';
        const desc = r.description || 'Full-stack / Machine Learning repository authored by Aju Eldo.';
        const updated = new Date(r.updated_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        card.innerHTML = `
          <div>
            <div class="project-category-tag">${escapeHTML(lang)} · ${updated}</div>
            <h3 class="project-title">${escapeHTML(r.name.replace(/[-_]/g, ' '))}</h3>
            <p class="project-desc">${escapeHTML(desc)}</p>
          </div>
          <div class="project-footer">
            <span class="project-link">
              <span>View Details</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </span>
          </div>
        `;

        card.addEventListener('click', () => {
          openModal(r.name.replace(/[-_]/g, ' '), `${lang} · ★ ${r.stargazers_count} · ⑂ ${r.forks_count}`, desc, r.html_url);
        });

        container.appendChild(card);
      });
    } catch (e) {
      container.innerHTML = `
        <div class="gh-loading-msg">
          <p>Repositories available directly on <a href="https://github.com/Aju6010" target="_blank" style="color:var(--accent);">GitHub @Aju6010 ↗</a></p>
        </div>
      `;
    }
  }

  function openModal(title, lang, desc, url) {
    const modal = document.getElementById('modal');
    const mTitle = document.getElementById('mTitle');
    const mLang = document.getElementById('mLang');
    const mDesc = document.getElementById('mDesc');
    const mLink = document.getElementById('mLink');

    if (mTitle) mTitle.textContent = title;
    if (mLang) mLang.textContent = lang;
    if (mDesc) mDesc.textContent = desc;
    if (mLink) mLink.href = url;

    if (modal) modal.classList.add('open');
  }

  window.closeModal = function() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('open');
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeModal();
  });

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ==========================================================================
     6. MOBILE DRAWER & CONTACT FORM
     ========================================================================== */
  function initMobileNav() {
    const toggle = document.getElementById('mobileToggle');
    const drawer = document.getElementById('mobileNav');
    const links = document.querySelectorAll('.mob-link');

    if (!toggle || !drawer) return;

    toggle.addEventListener('click', () => {
      drawer.classList.toggle('open');
    });

    links.forEach(l => {
      l.addEventListener('click', () => {
        drawer.classList.remove('open');
      });
    });
  }

  window.sendMsg = function() {
    const n = document.getElementById('cfn').value.trim();
    const e = document.getElementById('cfe').value.trim();
    const s = document.getElementById('cfs').value;
    const m = document.getElementById('cfm').value.trim();
    const msgEl = document.getElementById('fmsg');
    const btn = document.getElementById('sbtn');

    msgEl.className = 'fmsg';
    msgEl.style.display = 'none';

    if (!n || !e || !m) {
      msgEl.className = 'fmsg err';
      msgEl.textContent = 'Please fill out your name, email, and message.';
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      msgEl.className = 'fmsg err';
      msgEl.textContent = 'Please enter a valid email address.';
      return;
    }

    document.getElementById('sbtnT').textContent = 'Opening Email Client...';

    const subject = encodeURIComponent(s || `Portfolio Message from ${n}`);
    const body = encodeURIComponent(`Name: ${n}\nEmail: ${e}\nPurpose: ${s || 'General'}\n\nMessage:\n${m}`);
    const mailto = `mailto:ajueldo6010@gmail.com?subject=${subject}&body=${body}`;

    window.open(mailto, '_blank');

    setTimeout(() => {
      document.getElementById('sbtnT').textContent = 'Send Message';
      msgEl.className = 'fmsg ok';
      msgEl.textContent = 'Email client opened! You can also reach me directly at ajueldo6010@gmail.com';
      document.getElementById('cfn').value = '';
      document.getElementById('cfe').value = '';
      document.getElementById('cfs').value = '';
      document.getElementById('cfm').value = '';
    }, 1000);
  };

  /* ==========================================================================
     7. INITIALIZATION
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initThemeAndColors();
    initThree();
    typeEffect();
    initObservers();
    loadGitHubRepos();
    initMobileNav();
  });

})();

