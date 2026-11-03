(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sceneState = {
    renderer: null,
    scene: null,
    camera: null,
    roadX: z => Math.sin(z * .024) * 1.55 + Math.sin(z * .057) * .48,
    targetProgress: 0,
    progress: 0,
    time: 0,
    frameDelta: 1 / 60,
    clock: null,
    walker: null,
    leftLeg: null,
    rightLeg: null,
    leftArm: null,
    rightArm: null,
    frame: 0,
    pointer: { x: 0, y: 0 },
    lookPointer: { x: 0, y: 0 }
  };

  function createRoad(scene) {
    const positions = [];
    const indices = [];
    const steps = 1100;
    const startZ = 48;
    const endZ = -278;
    const width = 9.5;
    for (let i = 0; i <= steps; i += 1) {
      const z = startZ + (endZ - startZ) * (i / steps);
      const center = sceneState.roadX(z);
      positions.push(center - width / 2, .015, z, center + width / 2, .015, z);
      if (i < steps) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeometry.setIndex(indices);
    roadGeometry.computeVertexNormals();
    const road = new THREE.Mesh(roadGeometry, new THREE.MeshStandardMaterial({
      color: 0x1c221e, roughness: .94, metalness: .06, side: THREE.DoubleSide
    }));
    road.receiveShadow = true;
    scene.add(road);

    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x7e6652, transparent: true, opacity: .38 });
    [-1, 1].forEach(edge => {
      const points = [];
      for (let i = 0; i <= steps; i += 3) {
        const z = startZ + (endZ - startZ) * (i / steps);
        points.push(new THREE.Vector3(sceneState.roadX(z) + edge * (width / 2 - .16), .05, z));
      }
      const curve = new THREE.BufferGeometry().setFromPoints(points);
      scene.add(new THREE.Line(curve, edgeMaterial));
    });

    const dashGeometry = new THREE.BoxGeometry(.09, .025, 1.05);
    const dashMaterial = new THREE.MeshStandardMaterial({ color: 0xe8a16b, emissive: 0x693c20, emissiveIntensity: .5, roughness: .8 });
    const dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, 92);
    const transform = new THREE.Object3D();
    for (let i = 0; i < 92; i += 1) {
      const z = 44 - i * 3.45;
      transform.position.set(sceneState.roadX(z), .055, z);
      transform.updateMatrix();
      dashes.setMatrixAt(i, transform.matrix);
    }
    scene.add(dashes);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 420),
      new THREE.MeshStandardMaterial({ color: 0x111612, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -.11, -112);
    ground.receiveShadow = true;
    scene.add(ground);

    const vergeMaterial = new THREE.MeshBasicMaterial({ color: 0x303832, wireframe: true, transparent: true, opacity: .15 });
    const vergeGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const verge = new THREE.InstancedMesh(vergeGeo, vergeMaterial, 100);
    const blockTransform = new THREE.Object3D();
    let blockIndex = 0;
    for (let i = 0; i < 50; i += 1) {
      const z = 36 - i * 5.5;
      for (const side of [-1, 1]) {
        const scale = .3 + ((i * 13 + (side > 0 ? 5 : 0)) % 7) * .11;
        blockTransform.scale.set(scale * (1 + i % 3), scale * (1.4 + i % 4), scale);
        blockTransform.position.set(sceneState.roadX(z) + side * (6.5 + (i % 4) * .9), scale * .55 - .08, z);
        blockTransform.rotation.set(0, (i % 5) * .21, 0);
        blockTransform.updateMatrix();
        verge.setMatrixAt(blockIndex++, blockTransform.matrix);
      }
    }
    scene.add(verge);

    const portalGeometry = new THREE.TorusGeometry(2.4, .025, 5, 48);
    for (let i = 0; i < 9; i += 1) {
      const portal = new THREE.Mesh(portalGeometry, new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xe4a06c : 0xa5aaa0, transparent: true, opacity: i % 3 === 0 ? .25 : .1
      }));
      portal.position.set(sceneState.roadX(12 - i * 27), 2.9, 12 - i * 27);
      scene.add(portal);
    }
  }

  function buildWalker(scene) {
    const person = new THREE.Group();
    const coat = new THREE.MeshStandardMaterial({ color: 0xe2e6dd, emissive: 0x454a43, emissiveIntensity: .42, roughness: .68, metalness: .04 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x252b27, roughness: .8 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xf0a463, emissive: 0x8a4823, emissiveIntensity: .75, roughness: .35 });
    const sphere = new THREE.SphereGeometry(.19, 14, 12);
    const head = new THREE.Mesh(sphere, coat);
    head.position.y = 1.83;
    person.add(head);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(.19, .27, .78, 9), coat);
    body.position.y = 1.25;
    person.add(body);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(.3, .48, .16), dark);
    pack.position.set(0, 1.31, -.19);
    person.add(pack);
    const signal = new THREE.Mesh(new THREE.SphereGeometry(.075, 10, 8), glow);
    signal.position.set(0, 1.35, .245);
    person.add(signal);

    const beacon = new THREE.PointLight(0xf0a463, 2.1, 7, 2);
    beacon.position.set(0, 1.35, .42);
    person.add(beacon);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(.58, .018, 5, 40),
      new THREE.MeshBasicMaterial({ color: 0xf0a463, transparent: true, opacity: .62 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = .035;
    person.add(halo);

    const limb = (length, radius, material) => {
      const pivot = new THREE.Group();
      const segment = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, length, 7), material);
      segment.position.y = -length / 2;
      pivot.add(segment);
      return pivot;
    };
    const leftLeg = limb(.73, .085, dark);
    const rightLeg = limb(.73, .085, dark);
    leftLeg.position.set(-.12, .91, 0);
    rightLeg.position.set(.12, .91, 0);
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(.15, .09, .28), coat);
    const rightFoot = leftFoot.clone();
    leftFoot.position.set(0, -.71, .055);
    rightFoot.position.set(0, -.71, .055);
    leftLeg.add(leftFoot);
    rightLeg.add(rightFoot);
    person.add(leftLeg, rightLeg);

    const leftArm = limb(.63, .065, coat);
    const rightArm = limb(.63, .065, coat);
    leftArm.position.set(-.29, 1.49, 0);
    rightArm.position.set(.29, 1.49, 0);
    person.add(leftArm, rightArm);
    person.scale.setScalar(1.42);
    scene.add(person);
    sceneState.walker = person;
    sceneState.leftLeg = leftLeg;
    sceneState.rightLeg = rightLeg;
    sceneState.leftArm = leftArm;
    sceneState.rightArm = rightArm;
  }

  function placeCamera(progress, immediate = false) {
    if (!sceneState.camera || !sceneState.renderer) return;
    const z = 18 - progress * 204;
    const mobile = window.innerWidth < 700;
    const desiredX = sceneState.roadX(z + 12) + (mobile ? 2.4 : 6.4) + sceneState.lookPointer.x * (mobile ? .5 : 1.25);
    const desiredY = (mobile ? 6.2 : 7.1) + sceneState.lookPointer.y * .45;
    const desiredLookX = sceneState.roadX(z - 10) + (mobile ? .1 : -2.2) + sceneState.lookPointer.x * .55;
    const desiredLookZ = z - 13;
    if (immediate || reducedMotion.matches) {
      sceneState.camera.position.set(desiredX, desiredY, z + .5);
      sceneState.camera.lookAt(desiredLookX, .2, desiredLookZ);
    } else {
      const ease = 1 - Math.exp(-4 * sceneState.frameDelta);
      sceneState.camera.position.x += (desiredX - sceneState.camera.position.x) * ease;
      sceneState.camera.position.y += (desiredY - sceneState.camera.position.y) * ease;
      sceneState.camera.position.z += (z + .5 - sceneState.camera.position.z) * ease;
      const look = new THREE.Vector3(desiredLookX, .2, desiredLookZ);
      sceneState.camera.lookAt(look);
    }
    if (sceneState.walker) {
      sceneState.walker.position.set(sceneState.roadX(z - 8), .06, z - 8);
      const tangent = sceneState.roadX(z - 10) - sceneState.roadX(z - 6);
      sceneState.walker.rotation.y = Math.atan2(tangent, -4);
    }
    if (reducedMotion.matches) sceneState.renderer.render(sceneState.scene, sceneState.camera);
  }

  function init3DWorld() {
    const canvas = document.getElementById('worldCanvas');
    if (!canvas || !window.THREE) {
      document.documentElement.classList.add('no-webgl');
      return;
    }
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111612);
      scene.fog = new THREE.Fog(0x111612, 36, 205);
      const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, .1, 310);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      document.documentElement.classList.add('webgl-on');
      sceneState.scene = scene;
      sceneState.camera = camera;
      sceneState.renderer = renderer;
      sceneState.clock = new THREE.Clock();

      scene.add(new THREE.HemisphereLight(0xc5cec1, 0x151914, 1.15));
      const key = new THREE.DirectionalLight(0xffd1a2, 2.2);
      key.position.set(-7, 15, 10);
      scene.add(key);
      const rim = new THREE.PointLight(0xe58d53, 18, 34, 2);
      rim.position.set(2, 4, -11);
      scene.add(rim);
      const farLight = new THREE.PointLight(0x78816f, 9, 56, 2);
      farLight.position.set(-10, 8, -61);
      scene.add(farLight);

      createRoad(scene);

      const starPositions = new Float32Array(1100 * 3);
      for (let i = 0; i < 1100; i += 1) {
        starPositions[i * 3] = (Math.random() - .5) * 125;
        starPositions[i * 3 + 1] = 3 + Math.random() * 43;
        starPositions[i * 3 + 2] = 34 - Math.random() * 285;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x98a094, size: .085, transparent: true, opacity: .62, sizeAttenuation: true })));
      buildWalker(scene);

      sceneState.camera.position.set(sceneState.roadX(28) - 4.8, 7.1, 28.5);
      placeCamera(0, true);
      const resize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.6));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        placeCamera(sceneState.targetProgress, true);
      };
      window.addEventListener('resize', resize, { passive: true });
      if (!reducedMotion.matches) animateWorld();
      else renderer.render(scene, camera);
    } catch (error) {
      document.documentElement.classList.add('no-webgl');
      canvas.hidden = true;
    }
  }

  function animateWorld() {
    sceneState.frame = window.requestAnimationFrame(animateWorld);
    sceneState.frameDelta = Math.min(sceneState.clock.getDelta(), .05);
    sceneState.time += sceneState.frameDelta;
    const scrollEase = 1 - Math.exp(-2.8 * sceneState.frameDelta);
    sceneState.progress += (sceneState.targetProgress - sceneState.progress) * scrollEase;
    if (Math.abs(sceneState.progress - sceneState.targetProgress) < .0005) sceneState.progress = sceneState.targetProgress;
    placeCamera(sceneState.progress);
    const gait = Math.sin(sceneState.time * 2.25) * .32;
    if (sceneState.leftLeg) {
      sceneState.leftLeg.rotation.x = gait;
      sceneState.rightLeg.rotation.x = -gait;
      sceneState.leftArm.rotation.x = -gait * .72;
      sceneState.rightArm.rotation.x = gait * .72;
      sceneState.walker.position.y = .06 + Math.abs(gait) * .035;
    }
    sceneState.renderer.render(sceneState.scene, sceneState.camera);
  }

  function updateScrollScene() {
    const root = document.documentElement;
    const range = root.scrollHeight - root.clientHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    sceneState.targetProgress = progress;
    const bar = document.getElementById('readProgress');
    if (bar) bar.style.width = `${progress * 100}%`;
    const section = [...document.querySelectorAll('.chapter')].find(item => {
      const bounds = item.getBoundingClientRect();
      return bounds.top <= window.innerHeight * .58 && bounds.bottom > window.innerHeight * .35;
    });
    if (section) {
      document.getElementById('hudChapter').textContent = section.dataset.chapter || 'FIELD NOTES';
      document.querySelectorAll('.desktop-nav a').forEach(link => link.classList.toggle('active', link.hash === `#${section.id}`));
    }
    if (reducedMotion.matches) {
      sceneState.progress = progress;
      placeCamera(progress, true);
    }
  }

  function initNavigation() {
    const toggle = document.getElementById('menuToggle');
    const mobile = document.getElementById('mobileNav');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      mobile.classList.toggle('open', open);
    });
    mobile.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      mobile.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
    }));
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        mobile.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
      }
    });
  }

  function initReveals() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
      items.forEach(item => item.classList.add('is-in'));
      document.querySelectorAll('.chapter').forEach(item => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }), { threshold: .13, rootMargin: '0px 0px -6% 0px' });
    items.forEach(item => observer.observe(item));
    const chapterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    }), { threshold: .16 });
    document.querySelectorAll('.chapter').forEach(item => chapterObserver.observe(item));
  }

  function initPointerDepth() {
    const portrait = document.getElementById('heroPortrait');
    if (portrait && !reducedMotion.matches && window.matchMedia('(pointer:fine)').matches) {
      portrait.addEventListener('pointermove', event => {
        const rect = portrait.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width - .5;
        const ny = (event.clientY - rect.top) / rect.height - .5;
        portrait.style.setProperty('--tilt-x', `${(-ny * 8).toFixed(2)}deg`);
        portrait.style.setProperty('--tilt-y', `${(-nx * 11).toFixed(2)}deg`);
        sceneState.lookPointer.x = nx * .25;
        sceneState.lookPointer.y = ny * .25;
      });
      portrait.addEventListener('pointerleave', () => {
        portrait.style.setProperty('--tilt-x', '2deg');
        portrait.style.setProperty('--tilt-y', '-9deg');
        sceneState.lookPointer.x = 0;
        sceneState.lookPointer.y = 0;
      });
    }
  }

  function initTyping() {
    const phrases = ['Software & Data Developer', 'Data Analytics', 'Applied AI & Machine Learning', 'Technology problem solver', 'Campus Lead @ MuLearn VJCET'];
    const target = document.getElementById('typed');
    if (reducedMotion.matches) { target.textContent = phrases[0]; return; }
    let phrase = 0;
    let character = 0;
    let erasing = false;
    const tick = () => {
      const current = phrases[phrase];
      character += erasing ? -1 : 1;
      target.textContent = current.slice(0, character);
      if (!erasing && character === current.length) {
        erasing = true;
        window.setTimeout(tick, 1850);
        return;
      }
      if (erasing && character === 0) { erasing = false; phrase = (phrase + 1) % phrases.length; }
      window.setTimeout(tick, erasing ? 34 : 70);
    };
    tick();
  }

  function initProjectFilters() {
    const filters = document.querySelectorAll('.filter-chip');
    const projects = document.querySelectorAll('.work-item');
    filters.forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filters.forEach(item => item.classList.toggle('active', item === button));
      projects.forEach(project => project.classList.toggle('is-hidden', filter !== 'all' && project.dataset.category !== filter));
    }));
  }

  async function loadRepositories() {
    const container = document.getElementById('ghRepos');
    const count = document.getElementById('repoCount');
    const search = document.getElementById('repoSearch');
    const sort = document.getElementById('repoSort');
    let allRepositories = [];

    const render = () => {
      const query = search.value.trim().toLowerCase();
      const sortBy = sort.value;
      const repos = allRepositories.filter(repo => [repo.name, repo.description, repo.language]
        .some(value => (value || '').toLowerCase().includes(query)));
      repos.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stars') return b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name);
        return new Date(b.updated_at) - new Date(a.updated_at);
      });

      count.textContent = query
        ? `Showing ${repos.length} of ${allRepositories.length} public repositories`
        : `${allRepositories.length} public repositories`;
      container.replaceChildren();
      if (!repos.length) {
        const empty = document.createElement('p');
        empty.className = 'repo-loading';
        empty.textContent = query ? 'No repositories match that search.' : 'No public repositories found.';
        container.appendChild(empty);
        return;
      }
      repos.forEach(repo => {
        const link = document.createElement('a');
        link.className = 'repo-card';
        link.href = repo.html_url;
        link.target = '_blank';
        link.rel = 'noopener';
        const detail = document.createElement('small');
        const updated = repo.updated_at ? new Date(repo.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '';
        detail.textContent = `${repo.language || 'CODE'} · ★ ${repo.stargazers_count} · UPDATED ${updated}`;
        const title = document.createElement('h3');
        title.textContent = repo.name.replace(/[-_]/g, ' ');
        const description = document.createElement('p');
        description.textContent = repo.description || 'Repository by Aju Eldo.';
        link.append(detail, title, description);
        container.appendChild(link);
      });
    };

    search.addEventListener('input', render);
    sort.addEventListener('change', render);
    try {
      let page = 1;
      while (true) {
        const response = await fetch(`https://api.github.com/users/Aju6010/repos?type=owner&sort=updated&per_page=100&page=${page}`);
        if (!response.ok) throw new Error('GitHub unavailable');
        const pageRepos = await response.json();
        allRepositories.push(...pageRepos);
        if (pageRepos.length < 100) break;
        page += 1;
      }
      render();
    } catch {
      count.textContent = 'Could not load repositories';
      container.replaceChildren();
      const message = document.createElement('p');
      message.className = 'repo-loading';
      message.append('Repositories are available at ');
      const profile = document.createElement('a');
      profile.href = 'https://github.com/Aju6010';
      profile.target = '_blank';
      profile.rel = 'noopener';
      profile.textContent = 'github.com/Aju6010';
      message.append(profile, '.');
      container.appendChild(message);
    }
  }

  function initContactForm() {
    const form = document.getElementById('contactForm');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('cfn').value.trim();
      const email = document.getElementById('cfe').value.trim();
      const purpose = document.getElementById('cfs').value;
      const message = document.getElementById('cfm').value.trim();
      const status = document.getElementById('formStatus');
      if (!name || !email || !message) { status.textContent = 'Please complete your name, email, and message.'; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { status.textContent = 'Please enter a valid email address.'; return; }
      const subject = encodeURIComponent(purpose || `Portfolio message from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nPurpose: ${purpose || 'General'}\n\nMessage:\n${message}`);
      status.textContent = 'Opening your email app…';
      window.location.href = `mailto:ajueldo6010@gmail.com?subject=${subject}&body=${body}`;
    });
  }

  function updateReadout() {
    const chapter = String(Math.min(7, 1 + Math.floor(sceneState.progress * 7))).padStart(2, '0');
    const waypoint = String(Math.round(sceneState.progress * 204)).padStart(3, '0');
    document.getElementById('sceneReadout').textContent = `CHAPTER ${chapter} · WAYPOINT ${waypoint}`;
  }

  function init() {
    init3DWorld();
    initNavigation();
    initReveals();
    initPointerDepth();
    initTyping();
    initProjectFilters();
    initContactForm();
    loadRepositories();
    updateScrollScene();
    let scrollQueued = false;
    window.addEventListener('scroll', () => {
      if (scrollQueued) return;
      scrollQueued = true;
      window.requestAnimationFrame(() => {
        updateScrollScene();
        updateReadout();
        scrollQueued = false;
      });
    }, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
