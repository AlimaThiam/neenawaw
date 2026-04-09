/* ==========================================================================
   INVITATION DE MARIAGE - Mouhamed & Khadija
   Fichier JavaScript principal

   Ce fichier gère :
   1. L'écran d'accueil (splash screen)
   2. Les animations au scroll (Intersection Observer)
   3. Le bouton audio / musique
   4. Le compte à rebours
   5. La copie de l'IBAN
   6. Les coeurs flottants au clic
   ========================================================================== */

/* ===========================================================================
   VIDEO HELPERS (DRY) — lecture fiable iOS/Safari
   Objectif: éviter les vidéos qui "restent figées" en arrivant sur un slide.
   ========================================================================== */

function configureInlineVideo(video, options) {
    if (!video) return;
    const opts = options || {};
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    if (opts.preload) video.preload = opts.preload;
    if (typeof opts.loop === 'boolean') video.loop = opts.loop;
    if (typeof opts.muted === 'boolean') video.muted = opts.muted;
    if (typeof opts.volume === 'number') video.volume = opts.volume;
}

function safePlayInlineVideo(video, options) {
    if (!video) return Promise.resolve(false);
    const opts = options || {};
    const maxAttempts = typeof opts.maxAttempts === 'number' ? opts.maxAttempts : 4;
    const preferAudio = !!opts.preferAudio;
    const gestureFallback = opts.gestureFallback !== false;

    if (opts.displayBlock) video.style.display = 'block';
    configureInlineVideo(video, {
        preload: opts.preload || 'auto',
        loop: opts.loop,
        muted: typeof opts.muted === 'boolean' ? opts.muted : true,
        volume: typeof opts.volume === 'number' ? opts.volume : 1
    });

    if (opts.resetTime) {
        try { video.currentTime = typeof opts.startTime === 'number' ? opts.startTime : 0; } catch (e) { }
    }
    try { video.load(); } catch (e) { }

    let attempts = 0;
    let resolved = false;
    let gestureArmed = false;

    function cleanup() {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('loadeddata', onCanPlay);
    }

    function resolveOk(ok) {
        if (resolved) return;
        resolved = true;
        cleanup();
        return ok;
    }

    function tryPlayOnce(forceMuted) {
        if (resolved) return Promise.resolve(true);
        attempts++;
        if (typeof forceMuted === 'boolean') video.muted = forceMuted;
        let p;
        try { p = video.play(); } catch (e) { p = Promise.reject(e); }
        if (!p || !p.then) return Promise.resolve(resolveOk(true));
        return p.then(function () { return resolveOk(true); }).catch(function () {
            return false;
        });
    }

    function armGestureRetry() {
        if (!gestureFallback || gestureArmed || resolved) return;
        gestureArmed = true;
        const handler = function () {
            // best effort; no need to unarm manually (once:true)
            if (preferAudio) {
                tryPlayOnce(false).then(function (ok) {
                    if (!ok) tryPlayOnce(true);
                });
            } else {
                tryPlayOnce(true);
            }
        };
        document.addEventListener('pointerdown', handler, { once: true, passive: true });
        document.addEventListener('touchstart', handler, { once: true, passive: true });
    }

    function scheduleRetry() {
        if (resolved) return;
        if (attempts >= maxAttempts) {
            armGestureRetry();
            return;
        }
        requestAnimationFrame(function () {
            if (preferAudio) {
                tryPlayOnce(false).then(function (ok) {
                    if (!ok) {
                        tryPlayOnce(true).then(function (ok2) {
                            if (!ok2) scheduleRetry();
                        });
                    }
                });
            } else {
                tryPlayOnce(true).then(function (ok) {
                    if (!ok) scheduleRetry();
                });
            }
        });
    }

    function onCanPlay() {
        scheduleRetry();
    }

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('loadeddata', onCanPlay);

    // First attempts
    if (preferAudio) {
        return tryPlayOnce(false).then(function (ok) {
            if (ok) return true;
            return tryPlayOnce(true).then(function (ok2) {
                if (ok2) return true;
                scheduleRetry();
                armGestureRetry();
                return false;
            });
        });
    }

    return tryPlayOnce(true).then(function (ok) {
        if (ok) return true;
        scheduleRetry();
        armGestureRetry();
        return false;
    });
}


/* ==========================================================================
   1. SPLASH SCREEN — Enveloppe avec sceau de cire
   Le sceau M&K pulse pour inviter au clic.
   Quand on appuie :
     a) des particules dorées sont créées,
     b) le sceau se brise (animation CSS .cracking),
     c) des fragments volent,
     d) le rabat de l'enveloppe s'ouvre,
     e) le splash disparaît en fondu.
   ========================================================================== */

(function initSplash() {
    const splash = document.getElementById('splash');
    const waxSeal = document.getElementById('waxSeal');
    const flap = document.getElementById('envelopeFlap');
    const sparklesC = document.getElementById('sparkles');

    /* --- Génère les particules scintillantes de fond --- */
    function createSparkles() {
        for (let i = 0; i < 30; i++) {
            const s = document.createElement('div');
            s.className = 'sparkle';
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.animationDelay = (Math.random() * 3) + 's';
            s.style.animationDuration = (2 + Math.random() * 2) + 's';
            sparklesC.appendChild(s);
        }
    }
    createSparkles();

    /* --- Crée les fissures SVG sur le sceau --- */
    function createCracks() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'seal-cracks');
        svg.setAttribute('viewBox', '0 0 122 122');
        svg.setAttribute('fill', 'none');

        // Fissure principale (du haut vers le bas en zigzag)
        const lines = [
            { x1: 61, y1: 10, x2: 55, y2: 35 },
            { x1: 55, y1: 35, x2: 65, y2: 55 },
            { x1: 65, y1: 55, x2: 58, y2: 75 },
            { x1: 58, y1: 75, x2: 63, y2: 95 },
            { x1: 63, y1: 95, x2: 60, y2: 112 },
            // Branches secondaires
            { x1: 55, y1: 35, x2: 35, y2: 45 },
            { x1: 65, y1: 55, x2: 85, y2: 50 },
            { x1: 58, y1: 75, x2: 38, y2: 82 },
            { x1: 63, y1: 95, x2: 80, y2: 90 },
        ];

        lines.forEach(l => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', l.x1);
            line.setAttribute('y1', l.y1);
            line.setAttribute('x2', l.x2);
            line.setAttribute('y2', l.y2);
            svg.appendChild(line);
        });

        waxSeal.appendChild(svg);
        return svg;
    }

    /* --- Crée les deux moitiés du sceau qui se séparent --- */
    function createHalves() {
        const rect = waxSeal.getBoundingClientRect();
        const parent = waxSeal.parentElement;
        const parentRect = parent.getBoundingClientRect();

        // Position relative au parent (.envelope)
        const relLeft = rect.left - parentRect.left;
        const relTop = rect.top - parentRect.top;

        ['left', 'right'].forEach(side => {
            const half = document.createElement('div');
            half.className = 'seal-half ' + side;
            half.style.position = 'absolute';
            half.style.left = relLeft + 'px';
            half.style.top = relTop + 'px';
            half.style.width = rect.width + 'px';
            half.style.height = rect.height + 'px';

            const inner = document.createElement('div');
            inner.className = 'seal-half-inner';
            half.appendChild(inner);
            parent.appendChild(half);

            // Nettoie après l'animation
            setTimeout(() => half.remove(), 800);
        });
    }

    /* --- Crée les petits fragments/poussière --- */
    function createFragments() {
        const rect = waxSeal.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        for (let i = 0; i < 16; i++) {
            const frag = document.createElement('div');
            frag.className = 'seal-fragment';
            const piece = document.createElement('div');
            piece.className = 'seal-fragment-piece';

            const angle = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.5;
            const dist = 50 + Math.random() * 100;
            const fx = Math.cos(angle) * dist;
            const fy = Math.sin(angle) * dist - 20;
            const fr = (Math.random() - 0.5) * 720;

            piece.style.setProperty('--fx', fx + 'px');
            piece.style.setProperty('--fy', fy + 'px');
            piece.style.setProperty('--fr', fr + 'deg');
            piece.style.width = (6 + Math.random() * 12) + 'px';
            piece.style.height = (6 + Math.random() * 12) + 'px';

            frag.style.left = (cx - 10) + 'px';
            frag.style.top = (cy - 10) + 'px';
            frag.appendChild(piece);
            splash.appendChild(frag);

            setTimeout(() => frag.remove(), 900);
        }
    }

    /* --- Au clic sur le sceau --- */
    waxSeal.addEventListener('click', function handleSealClick() {
        // Empêche les clics multiples
        waxSeal.removeEventListener('click', handleSealClick);

        // 1) Le sceau tremble (vibration)
        waxSeal.classList.add('shaking');

        // 2) Après 0.3s, les fissures apparaissent
        setTimeout(() => {
            const cracks = createCracks();
            // Petite pause puis affiche les fissures
            requestAnimationFrame(() => cracks.classList.add('visible'));
        }, 300);

        // 3) Après 0.7s, le sceau se brise : moitiés + fragments + poussière
        setTimeout(() => {
            createHalves();
            createFragments();
            waxSeal.classList.add('broken');
        }, 700);

        // 4) Après 1.0s, ouvre le rabat de l'enveloppe
        setTimeout(() => {
            flap.classList.add('open');
        }, 1000);

        // 5) Après 1.5s, lance la musique et fait disparaître le splash
        setTimeout(() => {
            splash.classList.add('hide');
            // Lance la musique de fond automatiquement (volume doux)
            const bgMusic = document.getElementById('bgMusic');
            if (bgMusic) {
                bgMusic.volume = 0.08;
                bgMusic.play().catch(() => { });
            }
        }, 1500);

        // 6) Après 2.3s, on retire le splash et on montre la page titre
        setTimeout(() => {
            splash.style.display = 'none';
            showTitlePage();
        }, 2300);
    });
})();

/* ==========================================================================
   3b. AUDIO BUTTON — Contrôle mute/unmute
   Bouton placé en haut à droite; change d'icône quand on mute
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
    const audioBtn = document.getElementById('audioBtn');
    const bgMusic = document.getElementById('bgMusic');
    const iconMute = document.getElementById('icon-mute');
    const iconUnmute = document.getElementById('icon-unmute');

    if (!audioBtn || !bgMusic) return;

    // Initialise l'état selon si la musique est en pause
    function updateButton() {
        if (bgMusic.muted || bgMusic.paused) {
            iconUnmute.style.display = 'none';
            iconMute.style.display = 'block';
            audioBtn.classList.remove('playing');
        } else {
            iconUnmute.style.display = 'block';
            iconMute.style.display = 'none';
            audioBtn.classList.add('playing');
        }
    }

    // Toggle mute/play behavior
    audioBtn.addEventListener('click', function () {
        if (bgMusic.paused) {
            bgMusic.volume = 0.08;
            bgMusic.play().catch(() => { bgMusic.muted = false; });
            bgMusic.muted = false;
        } else {
            // If playing, mute/pause depending on preference
            if (bgMusic.muted) {
                bgMusic.muted = false;
                bgMusic.play().catch(() => { });
            } else {
                bgMusic.muted = true;
            }
        }
        updateButton();
    });

    // Update when playback changes
    bgMusic.addEventListener('play', updateButton);
    bgMusic.addEventListener('pause', updateButton);
    bgMusic.addEventListener('volumechange', updateButton);

    // initial state
    updateButton();
});


/* ==========================================================================
   2. PAGE TITRE — Apparaît après l'enveloppe
   Affiche "L'histoire de Mouhamed & Khadija" pendant 3 secondes
   puis disparaît pour lancer les stories
   ========================================================================== */

function showTitlePage() {
    const titlePage = document.getElementById('titlePage');
    const heartsContainer = document.getElementById('titleHearts');
    const sparklesContainer = document.getElementById('titleSparkles');

    // Affiche la page titre
    titlePage.classList.add('visible');

    // --- Génère les cœurs flottants romantiques ---
    const heartEmojis = ['❤️', '💕', '💗', '💖', '🩷', '💞', '💓', '🌹'];
    const sizes = ['small', 'medium', 'medium', 'large', 'xlarge'];

    for (let i = 0; i < 35; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-love-heart ' + sizes[Math.floor(Math.random() * sizes.length)];
        heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
        heart.style.left = (Math.random() * 100) + '%';
        heart.style.setProperty('--delay', (Math.random() * 3) + 's');
        heart.style.setProperty('--duration', (3 + Math.random() * 4) + 's');
        heart.style.setProperty('--sway', ((Math.random() - 0.5) * 80) + 'px');
        heartsContainer.appendChild(heart);
    }

    // --- Génère les petites particules brillantes ---
    for (let i = 0; i < 20; i++) {
        const dot = document.createElement('div');
        dot.className = 'title-sparkle-dot';
        dot.style.left = (Math.random() * 100) + '%';
        dot.style.top = (Math.random() * 100) + '%';
        dot.style.setProperty('--del', (Math.random() * 3) + 's');
        dot.style.setProperty('--dur', (1.5 + Math.random() * 2) + 's');
        sparklesContainer.appendChild(dot);
    }

    // Après 4s, la page titre disparaît (un peu plus long pour profiter des cœurs)
    setTimeout(() => {
        titlePage.classList.add('hide');
    }, 4000);

    // Après 4.8s, on la retire et on lance les stories
    setTimeout(() => {
        titlePage.style.display = 'none';
        startStories();
    }, 4800);
}


/* ==========================================================================
   2b. STORIES — Navigation style WhatsApp
   12 stories avec barres de progression, avance automatique (5s),
   tap gauche = précédent, tap droite = suivant
   ========================================================================== */

function startStories() {
    const container = document.getElementById('storiesContainer');
    const slides = container.querySelectorAll('.story-slide');
    const dots = container.querySelectorAll('.stories-dots .dot');
    const navLeft = document.getElementById('storyNavLeft');
    const navRight = document.getElementById('storyNavRight');
    const STORY_DURATION = 5000; // 5 secondes par story
    let currentIndex = 0;
    let timer = null;

    // Affiche le conteneur des stories
    container.classList.add('active');
    document.body.style.overflow = 'hidden';

    /* --- Transitions CapCut : entrées et sorties variées --- */
    const enterEffects = [
        'tr-zoom-in', 'tr-zoom-out', 'tr-slide-right', 'tr-slide-left',
        'tr-slide-up', 'tr-rotate', 'tr-flip', 'tr-blur',
        'tr-diagonal', 'tr-drop'
    ];
    const leaveEffects = [
        'leave-zoom', 'leave-left', 'leave-right', 'leave-up',
        'leave-shrink', 'leave-rotate', 'leave-blur', 'leave-flip'
    ];

    function playStoryVideoSlide(videoElement) {
        var bgMusic = document.getElementById('bgMusic');
        var musicWasPlaying = bgMusic && !bgMusic.paused && !bgMusic.muted;
        var startedAt = Date.now();
        var minReadableMs = 7000;
        var advanceQueued = false;
        if (bgMusic && musicWasPlaying) {
            bgMusic.pause();
        }

        videoElement.style.display = 'block';
        videoElement.setAttribute('playsinline', '');
        videoElement.setAttribute('webkit-playsinline', '');
        videoElement.preload = 'auto';
        try { videoElement.currentTime = 0; } catch (e) { }
        try { videoElement.load(); } catch (e) { }

        var finished = false;
        function finishAndNextStory() {
            if (finished) return;
            finished = true;
            advanceQueued = false;
            videoElement.onended = null;
            if (bgMusic && musicWasPlaying) {
                bgMusic.volume = 0.08;
                bgMusic.play().catch(function () { });
            }
            showStory(currentIndex + 1);
        }

        function queueAdvanceAfterReadableTime() {
            if (finished || advanceQueued) return;
            advanceQueued = true;
            var elapsed = Date.now() - startedAt;
            var waitForReadable = Math.max(0, minReadableMs - elapsed);
            clearTimeout(timer);
            timer = setTimeout(finishAndNextStory, waitForReadable);
        }

        function armDurationFallback() {
            if (!isNaN(videoElement.duration) && isFinite(videoElement.duration) && videoElement.duration > 0) {
                clearTimeout(timer);
                timer = setTimeout(queueAdvanceAfterReadableTime, Math.ceil(videoElement.duration * 1000) + 1200);
            } else {
                clearTimeout(timer);
                timer = setTimeout(queueAdvanceAfterReadableTime, 45000);
            }
        }

        videoElement.onended = queueAdvanceAfterReadableTime;
        if (videoElement.readyState >= 1) {
            armDurationFallback();
        } else {
            videoElement.addEventListener('loadedmetadata', armDurationFallback, { once: true });
        }

        videoElement.muted = false;
        videoElement.volume = 1;
        var playPromise = videoElement.play();
        if (playPromise) {
            playPromise.catch(function () {
                videoElement.muted = true;
                videoElement.play().catch(function () {
                    clearTimeout(timer);
                    timer = setTimeout(queueAdvanceAfterReadableTime, 6000);
                });
            });
        }
    }

    /* --- Affiche la story à l'index donné --- */
    function showStory(index) {
        // Sécurité : si on dépasse la dernière story, on ferme les stories
        if (index >= slides.length) {
            closeStories();
            return;
        }
        if (index < 0) index = 0;

        const prevIndex = currentIndex;
        currentIndex = index;

        // Arrête le timer précédent
        clearTimeout(timer);

        // --- Pause et masque toute vidéo des slides non-actives ---
        slides.forEach(s => {
            const vid = s.querySelector('.story-video');
            if (vid) { try { vid.pause(); vid.currentTime = 0; } catch (e) { }; vid.style.display = 'none'; }
            // Pause aussi toutes les vidéos de fond
            const bgVideos = s.querySelectorAll('.story-bg-video');
            if (bgVideos.length > 0) {
                bgVideos.forEach(function (bgv) {
                    try { bgv.pause(); bgv.currentTime = 0; } catch (e) { }
                    bgv.onended = null;
                    bgv.onerror = null;
                    bgv.onloadedmetadata = null;
                    bgv.style.display = 'none';
                });
            }
            // Pause aussi les vidéos du collage
            const collageVids = s.querySelectorAll('.collage-video');
            if (collageVids.length > 0) {
                collageVids.forEach(cv => {
                    try { cv.pause(); cv.currentTime = 0; } catch (e) { };
                });
            }
            // Reset des vidéos séquentielles
            const seqVideos = s.querySelectorAll('.sequential-video');
            if (seqVideos.length > 0) {
                seqVideos.forEach(function (sv, idx) {
                    sv.classList.toggle('is-active', idx === 0);
                    sv.style.display = idx === 0 ? 'block' : 'none';
                    sv.onended = null;
                });
            }
        });

        // --- Transition de sortie sur l'ancienne story ---
        if (prevIndex !== currentIndex && slides[prevIndex]) {
            const prevSlide = slides[prevIndex];
            const leaveClass = leaveEffects[currentIndex % leaveEffects.length];
            prevSlide.classList.remove('active');
            // Nettoie les anciennes classes de transition
            enterEffects.forEach(c => prevSlide.classList.remove(c));
            leaveEffects.forEach(c => prevSlide.classList.remove(c));
            prevSlide.classList.add('leaving', leaveClass);
            // Retire la classe leaving après la transition
            setTimeout(() => {
                prevSlide.classList.remove('leaving', leaveClass);
            }, 600);
        }

        // --- Transition d'entrée sur la nouvelle story ---
        const enterClass = enterEffects[currentIndex % enterEffects.length];
        const currentSlide = slides[currentIndex];
        const storyVideo = currentSlide ? currentSlide.querySelector('.story-video') : null;
        const bgVideo = currentSlide ? currentSlide.querySelector('.story-bg-video') : null;
        const collageVideos = currentSlide ? currentSlide.querySelectorAll('.collage-video') : [];

        slides.forEach((slide, i) => {
            if (i === currentIndex) {
                // Nettoie puis applique la classe d'entrée
                enterEffects.forEach(c => slide.classList.remove(c));
                leaveEffects.forEach(c => slide.classList.remove(c));
                slide.classList.remove('active', 'leaving');
                slide.classList.add(enterClass);
                // Force reflow puis active la transition
                slide.offsetHeight;
                slide.classList.add('active');
                slide.classList.remove(enterClass);
            } else if (i !== (prevIndex !== currentIndex ? prevIndex : -1)) {
                slide.classList.remove('active', 'leaving');
                enterEffects.forEach(c => slide.classList.remove(c));
                leaveEffects.forEach(c => slide.classList.remove(c));
            }
        });

        // Cache/affiche les zones de nav invisible selon le type de slide
        var isVideoSlide = currentSlide && currentSlide.classList.contains('story-video-slide');
        navLeft.style.pointerEvents = isVideoSlide ? 'none' : 'auto';
        navRight.style.pointerEvents = isVideoSlide ? 'none' : 'auto';

        // Met à jour les points indicateurs
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });

        // Timer pour avancer automatiquement après STORY_DURATION
        // Si c'est une story vidéo (.story-video), on attend la fin de la vidéo
        // Les vidéos de fond (.story-bg-video) ne bloquent PAS l'avancement



        // --- INTERLUDE VIDÉO DEMANDE : après story index 7 avant la 9 ---
        if (prevIndex === 7 && currentIndex === 8) {
            currentSlide.classList.remove('active');

            showVideoInterlude('interludeProposal', 'interludeProposalVideo', {
                onPrev: function () {
                    showStory(currentIndex - 1);
                }
            }, function () {
                currentSlide.classList.add('active');

                if (bgVideo && !storyVideo) {
                    bgVideo.onended = null;
                    var hasRevealText2 = !!currentSlide.querySelector('.reveal-words');
                    var minReadableMs2 = hasRevealText2 ? 7000 : STORY_DURATION;
                    bgVideo.loop = hasRevealText2;
                    safePlayInlineVideo(bgVideo, {
                        muted: true,
                        loop: hasRevealText2,
                        resetTime: true,
                        displayBlock: true,
                        preload: 'auto',
                        maxAttempts: 4,
                        gestureFallback: true
                    });
                    timer = setTimeout(function () {
                        showStory(currentIndex + 1);
                    }, minReadableMs2);
                } else if (storyVideo) {
                    playStoryVideoSlide(storyVideo);
                } else {
                    timer = setTimeout(function () { showStory(currentIndex + 1); }, STORY_DURATION);
                }
            });
            return;
        }

        // Vidéo de fond : on la lance mais elle ne bloque pas, timer normal
        else if (bgVideo && !storyVideo) {
            bgVideo.onended = null;
            var hasRevealText = !!currentSlide.querySelector('.reveal-words');
            var configuredRevealMs = parseInt(currentSlide.dataset.revealMs || '0', 10);
            var phraseEndMs = (!isNaN(configuredRevealMs) && configuredRevealMs > 0)
                ? (configuredRevealMs + 600)
                : (hasRevealText ? 7000 : STORY_DURATION);
            var minReadableMs = phraseEndMs;
            var waitVideoEnd = currentSlide.classList.contains('story-wait-video-end');
            var videoBehavior = currentSlide.dataset.videoBehavior || '';
            bgVideo.loop = hasRevealText;
            safePlayInlineVideo(bgVideo, {
                muted: true,
                loop: hasRevealText,
                resetTime: true,
                displayBlock: true,
                preload: 'auto',
                maxAttempts: 4,
                gestureFallback: true
            });

            if (videoBehavior === 'loop-until-text') {
                bgVideo.loop = true;
                timer = setTimeout(function () {
                    showStory(currentIndex + 1);
                }, phraseEndMs);
                return;
            }

            if (videoBehavior === 'stop-at-text-end') {
                bgVideo.loop = false;
                timer = setTimeout(function () {
                    try { bgVideo.pause(); } catch (e) { }
                    showStory(currentIndex + 1);
                }, phraseEndMs);
                return;
            }

            // Story 5 (index 4) : ne jamais dépendre de la fin vidéo
            var forceTextOnlyAdvance = currentIndex === 4;

            if (waitVideoEnd && !forceTextOnlyAdvance) {
                bgVideo.loop = false;
                bgVideo.onended = function () {
                    showStory(currentIndex + 1);
                };

                var fallbackDelay = (!isNaN(bgVideo.duration) && isFinite(bgVideo.duration) && bgVideo.duration > 0)
                    ? Math.ceil(bgVideo.duration * 1000) + 1200
                    : 45000;
                timer = setTimeout(function () {
                    showStory(currentIndex + 1);
                }, fallbackDelay);
            } else {
                timer = setTimeout(() => {
                    showStory(currentIndex + 1);
                }, minReadableMs);
            }
        }
        // Collage de vidéos multiples : jouer toutes les vidéos en parallèle, sans bloquer l'avancement
        else if (collageVideos.length > 0) {
            var hasRevealTextCollage = !!currentSlide.querySelector('.reveal-words');
            var minReadableMsCollage = hasRevealTextCollage ? 7000 : STORY_DURATION;
            
            collageVideos.forEach(video => {
                video.style.display = 'block';
                video.muted = true;
                try { video.currentTime = 0; } catch (e) { }
                var playPromiseCollage = video.play();
                if (playPromiseCollage) {
                    playPromiseCollage.catch(function () {
                        document.addEventListener('touchstart', function retryPlayCollage() {
                            video.play().catch(function () { });
                            document.removeEventListener('touchstart', retryPlayCollage);
                        }, { once: true });
                    });
                }
            });
            
            timer = setTimeout(() => {
                showStory(currentIndex + 1);
            }, minReadableMsCollage);
        }
        // Vidéo principale (.story-video) : on attend sa fin
        // Sur mobile : pause la musique pour laisser le son de la vidéo, puis reprend
        else if (storyVideo) {
            playStoryVideoSlide(storyVideo);
        } else {
            timer = setTimeout(() => {
                showStory(currentIndex + 1);
            }, STORY_DURATION);
        }
    }

    /* --- Ferme les stories et lance les interludes --- */
    function closeStories() {
        clearTimeout(timer);
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.6s ease';
        setTimeout(() => {
            container.style.display = 'none';
            document.body.style.overflow = 'hidden';
            // Lance la séquence d'interludes puis les infos
            showInterludeSequence();
        }, 600);
    }

    /* --- Navigation au tap --- */
    navLeft.addEventListener('click', (e) => {
        // Ne pas naviguer si on est sur un slide vidéo (avec contrôles)
        var activeSlide = slides[currentIndex];
        if (activeSlide && activeSlide.classList.contains('story-video-slide')) return;
        showStory(currentIndex - 1);
    });

    navRight.addEventListener('click', (e) => {
        // Ne pas naviguer si on est sur un slide vidéo (avec contrôles)
        var activeSlide = slides[currentIndex];
        if (activeSlide && activeSlide.classList.contains('story-video-slide')) return;
        showStory(currentIndex + 1);
    });

    // Boutons de navigation dédiés sur le slide vidéo
    var videoNavPrev = document.getElementById('videoNavPrev');
    var videoNavNext = document.getElementById('videoNavNext');
    if (videoNavPrev) {
        videoNavPrev.addEventListener('click', function (e) {
            e.stopPropagation();
            showStory(currentIndex - 1);
        });
    }
    if (videoNavNext) {
        videoNavNext.addEventListener('click', function (e) {
            e.stopPropagation();
            showStory(currentIndex + 1);
        });
    }

    // Démarre la première story
    showStory(0);

    /* --- Interlude : flash entre story 7 (amour) et story 8 (certitude) --- */
    const INTERLUDE_AFTER_INDEX = 6; // après "L'amour grandissant" (data-index 6)
    const originalShowStory = showStory;
    // On surcharge showStory pour insérer l'interlude au bon moment
    // Remplacé par un hook dans le timer
}

/* ======================================================================
   Story 3 (collage) — rendu beau et adaptatif (DRY/SOLID)
   Objectif: éviter les grosses bandes noires sans couper la vidéo principale.
   Principe:
   - Vidéo principale: contain (proportions respectées)
   - Fond: clone de la même vidéo en cover + blur
   ====================================================================== */

function enhanceStory3Collage() {
    const slide3 = document.querySelector('.story-slide[data-index="2"]');
    if (!slide3) return;
    if (slide3.__collageEnhanced) return;

    const videos = Array.from(slide3.querySelectorAll('.video-collage > video.collage-video'));
    if (!videos.length) return;

    videos.forEach(function (videoEl) {
        if (!videoEl || videoEl.closest('.collage-tile')) return;

        const tile = document.createElement('div');
        tile.className = 'collage-tile';

        // Create background clone
        const bg = document.createElement('video');
        bg.className = 'collage-video-bg';
        bg.autoplay = true;
        bg.muted = true;
        bg.loop = true;
        bg.playsInline = true;
        bg.setAttribute('playsinline', '');
        bg.setAttribute('webkit-playsinline', '');

        // Copy sources (robust)
        const sources = videoEl.querySelectorAll('source');
        if (sources && sources.length) {
            sources.forEach(function (srcNode) {
                const s = document.createElement('source');
                s.src = srcNode.src;
                if (srcNode.type) s.type = srcNode.type;
                bg.appendChild(s);
            });
        } else if (videoEl.currentSrc || videoEl.src) {
            bg.src = videoEl.currentSrc || videoEl.src;
        }

        // Wrap: tile replaces the video in the grid
        const parent = videoEl.parentNode;
        parent.insertBefore(tile, videoEl);
        tile.appendChild(bg);
        tile.appendChild(videoEl);

        // Try to start bg playback (best effort)
        try { bg.load(); } catch (e) { }
        const p = bg.play();
        if (p && p.catch) p.catch(function () { });
    });

    slide3.__collageEnhanced = true;
}

document.addEventListener('DOMContentLoaded', function () {
    enhanceStory3Collage();
});


/* ==========================================================================
   INTERLUDE FLASH — Affiche une photo plein écran brièvement
   ========================================================================== */

/**
 * Flash interlude pendant les stories (ex: photo N&B entre 2 stories)
 * @param {string} id - ID de l'élément interlude
 * @param {function} callback - Appelé quand l'interlude est terminé
 */
function showFlashInterlude(id, callback) {
    const el = document.getElementById(id);
    if (!el) { if (callback) callback(); return; }

    el.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.classList.add('visible');
            el.style.opacity = '1';
        });
    });

    // Reste 3 secondes puis fondu de sortie
    setTimeout(() => {
        el.style.opacity = '0';
        el.classList.add('fade-out');
    }, 3000);

    setTimeout(() => {
        el.style.display = 'none';
        el.classList.remove('visible', 'fade-out');
        el.style.opacity = '0';
        if (callback) callback();
    }, 4000);
}

function showVideoInterlude(id, videoId, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    options = options || {};
    const el = document.getElementById(id);
    const video = document.getElementById(videoId);
    const bgMusic = document.getElementById('bgMusic');
    const shouldResumeBgMusic = !!bgMusic && !bgMusic.muted;
    const prevBtn = document.getElementById('interludePrevBtn');
    const nextBtn = document.getElementById('interludeNextBtn');
    if (!el || !video) { if (callback) callback(); return; }

    let done = false;
    let fallbackTimer = null;
    function finish(invokeCallback) {
        if (done) return;
        done = true;
        if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
        try { video.pause(); } catch (e) { }
        video.onended = null;
        if (prevBtn) prevBtn.onclick = null;
        if (nextBtn) nextBtn.onclick = null;
        el.style.display = 'none';
        el.classList.remove('visible');
        el.style.opacity = '0';
        if (bgMusic && shouldResumeBgMusic) {
            bgMusic.muted = false;
            bgMusic.volume = 0.08;
            bgMusic.play().catch(function () { });
        }
        if (invokeCallback !== false && callback) callback();
    }

    el.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.classList.add('visible');
            el.style.opacity = '1';
        });
    });

    try { video.currentTime = 0; } catch (e) { }
    video.volume = 1;
    video.onended = finish;

    if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
    }

    if (prevBtn) {
        prevBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            finish(false);
            if (typeof options.onPrev === 'function') options.onPrev();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            finish(true);
        };
    }

    // iOS/Safari : autoplay avec son est souvent bloqué. On tente avec son,
    // sinon on démarre en muet (et on garantit que ça ne reste pas figé).
    safePlayInlineVideo(video, {
        preferAudio: true,
        muted: false,
        resetTime: true,
        displayBlock: true,
        preload: 'auto',
        maxAttempts: 6,
        gestureFallback: true
    });

    const fallback = isNaN(video.duration) || !isFinite(video.duration) || video.duration <= 0
        ? 15000
        : Math.ceil(video.duration * 1000) + 800;
    fallbackTimer = setTimeout(function () { finish(true); }, fallback);
}

/**
 * Séquence d'interludes après la fin des stories, avant les infos
 * Montre la photo plage puis ouvre la section infos
 */
function showInterludeSequence() {
    document.body.style.overflow = 'auto';
    document.getElementById('info-section').classList.add('visible-section');
}


/* ==========================================================================
   2c. ANIMATIONS AU SCROLL — Intersection Observer
   ========================================================================== */

const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

/* Observe tous les éléments avec fade-in et les items de timeline */
document.querySelectorAll('.fade-in, .scale-in, .tl-item').forEach(el => {
    observer.observe(el);
});

/* Décalage progressif sur les items de la timeline verticale */
document.querySelectorAll('.tl-item').forEach((item, idx) => {
    item.style.transitionDelay = `${idx * 0.2}s`;
    observer.observe(item);
});

/* --- Confettis décoratifs dans la section infos --- */
(function generateInfoConfetti() {
    const container = document.getElementById('infoConfetti');
    if (!container) return;
    const colors = ['#d4b896', '#c4926e', '#e8d5bc', '#f5c6d0', '#bde0fe', '#ddb892', '#f0e0c8'];
    for (let i = 0; i < 35; i++) {
        const dot = document.createElement('div');
        dot.className = 'confetti-dot';
        dot.style.left = Math.random() * 100 + '%';
        dot.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        dot.style.setProperty('--cDur', (4 + Math.random() * 6) + 's');
        dot.style.setProperty('--cDel', (Math.random() * 8) + 's');
        dot.style.width = (5 + Math.random() * 6) + 'px';
        dot.style.height = dot.style.width;
        container.appendChild(dot);
    }
})();


/* ==========================================================================
   3. MUSIQUE DE FOND — Se lance automatiquement à l'ouverture de l'enveloppe
   Youssou N'Dour - I Love You
   ========================================================================== */
// La musique est gérée par l'élément <audio id="bgMusic"> dans le HTML
// Elle est lancée dans la section splash (étape 5 du clic sur le sceau)


/* ==========================================================================
   4. COMPTE À REBOURS — Se met à jour chaque seconde
   ========================================================================== */

// ⚠️ MODIFIEZ CETTE DATE pour votre mariage !
// Format : 'AAAA-MM-JJTHH:MM:SS'
const weddingDate = new Date('2026-04-18T17:00:00');

/**
 * Met à jour l'affichage du compte à rebours
 * Calcule la différence entre maintenant et la date du mariage
 */
function updateCountdown() {
    const now = new Date();
    const diff = weddingDate - now;  // Différence en millisecondes

    // Si la date est passée, afficher des zéros
    if (diff <= 0) {
        document.getElementById('cd-days').textContent = '0';
        document.getElementById('cd-hours').textContent = '0';
        document.getElementById('cd-mins').textContent = '0';
        document.getElementById('cd-secs').textContent = '0';
        return;
    }

    // Conversion des millisecondes en jours, heures, minutes, secondes
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    // Mise à jour de l'affichage
    document.getElementById('cd-days').textContent = days;
    document.getElementById('cd-hours').textContent = hours;
    document.getElementById('cd-mins').textContent = mins;
    document.getElementById('cd-secs').textContent = secs;
}

// Premier calcul immédiat
updateCountdown();

// Puis mise à jour chaque seconde (1000ms)
setInterval(updateCountdown, 1000);


/* ==========================================================================
   5. COPIE DE L'IBAN — Copie automatiquement l'IBAN dans le presse-papiers
   ========================================================================== 

document.getElementById('ibanBox').addEventListener('click', () => {
    // ⚠️ REMPLACEZ PAR VOTRE VRAI IBAN :
    const iban = 'FR76 XXXX XXXX XXXX XXXX XXXX XXX';

    // Copie dans le presse-papiers (supprime les espaces)
    navigator.clipboard.writeText(iban.replace(/\s/g, '')).then(() => {
        // Affiche le message de confirmation "IBAN copié !"
        document.getElementById('ibanCopied').classList.add('show');

        // Cache le message après 2 secondes
        setTimeout(() => {
            document.getElementById('ibanCopied').classList.remove('show');
        }, 2000);
    });
});
*/

/* ==========================================================================
   5. REVEAL WORDS — Texte mot par mot sur les slides vidéo
   ========================================================================== */

(function () {
    var slideTimers = new WeakMap();

    function toInt(value, fallback) {
        var n = parseInt(value, 10);
        return (isNaN(n) ? fallback : n);
    }

    function getOrCreateOriginalText(el) {
        var existing = el.getAttribute('data-original');
        if (existing && existing.trim()) return existing.trim();
        var txt = (el.textContent || '').trim();
        el.setAttribute('data-original', txt);
        return txt;
    }

    function prepareRevealElement(revealEl) {
        if (!revealEl) return;
        // Build spans once (idempotent)
        if (revealEl.__revealPrepared) return;

        var original = getOrCreateOriginalText(revealEl);
        var words = original ? original.split(/\s+/) : [];

        // Avoid any "flash" during rebuild
        var prevVis = revealEl.style.visibility;
        revealEl.style.visibility = 'hidden';
        revealEl.innerHTML = words.map(function (w) {
            return '<span class="word">' + w + '</span>';
        }).join(' ');
        revealEl.__revealPrepared = true;
        revealEl.style.visibility = prevVis || '';
    }

    function getSlideTimers(slide) {
        var timers = slideTimers.get(slide);
        if (!timers) {
            timers = [];
            slideTimers.set(slide, timers);
        }
        return timers;
    }

    function clearSlideTimeouts(slide) {
        var timers = slideTimers.get(slide);
        if (!timers || !timers.length) return;
        timers.forEach(function (t) { clearTimeout(t); });
        timers.length = 0;
    }

    function resetReveal(slide) {
        var revealEl = slide.querySelector('.reveal-words');
        var captionEl = slide.querySelector('.reveal-caption');
        if (!revealEl) {
            if (captionEl) captionEl.classList.remove('visible');
            return;
        }

        prepareRevealElement(revealEl);
        var allWords = revealEl.querySelectorAll('.word');
        allWords.forEach(function (w) { w.classList.remove('visible'); });
        if (captionEl) captionEl.classList.remove('visible');
    }

    function startReveal(slide) {
        if (!slide || !slide.classList || !slide.classList.contains('story-slide')) return;

        // Always cancel previous run (important when navigating back)
        clearSlideTimeouts(slide);
        resetReveal(slide);

        var revealEl = slide.querySelector('.reveal-words');
        var captionEl = slide.querySelector('.reveal-caption');
        if (!revealEl) return;

        var allWords = revealEl.querySelectorAll('.word');
        if (!allWords.length) {
            if (captionEl) captionEl.classList.add('visible');
            return;
        }

        var totalDuration = toInt(slide.dataset.revealMs || '3500', 3500);
        if (totalDuration < 1200) totalDuration = 3500;

        var initialDelay = 400;
        var perWordDelay = allWords.length > 1 ? (totalDuration / allWords.length) : 300;

        var timers = getSlideTimers(slide);

        allWords.forEach(function (word, i) {
            timers.push(setTimeout(function () {
                // Safety: if slide is no longer active, do nothing
                if (!slide.classList.contains('active')) return;
                word.classList.add('visible');
            }, initialDelay + i * perWordDelay));
        });

        if (captionEl) {
            timers.push(setTimeout(function () {
                if (!slide.classList.contains('active')) return;
                captionEl.classList.add('visible');
            }, initialDelay + allWords.length * perWordDelay + 300));
        }
    }

    function stopReveal(slide) {
        if (!slide || !slide.classList || !slide.classList.contains('story-slide')) return;
        clearSlideTimeouts(slide);
        resetReveal(slide);
    }

    // Prepare reveal elements once at load
    document.querySelectorAll('.reveal-words').forEach(function (el) {
        prepareRevealElement(el);
        // Ensure initial state is hidden
        var slide = el.closest ? el.closest('.story-slide') : null;
        if (slide) resetReveal(slide);
    });

    // Observe slides: start on activation, stop on deactivation
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.type !== 'attributes' || m.attributeName !== 'class') return;
            var slide = m.target;
            if (!slide.classList || !slide.classList.contains('story-slide')) return;
            if (slide.classList.contains('active')) startReveal(slide);
            else stopReveal(slide);
        });
    });

    document.querySelectorAll('.story-slide').forEach(function (slide) {
        observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
        // If a slide is already active at load, run now.
        if (slide.classList.contains('active')) startReveal(slide);
    });
})();

/* ======================================================================
   Slide 13 — Ken Burns doux (synchronisé avec le reveal)
   ====================================================================== */

(function () {
    var TARGET_INDEX = '12';

    function toInt(value, fallback) {
        var n = parseInt(value, 10);
        return (isNaN(n) ? fallback : n);
    }

    function applyKenBurns(slide, active) {
        if (!slide || !slide.dataset || slide.dataset.index !== TARGET_INDEX) return;
        if (active) {
            // Si pas de data-reveal-ms sur ce slide, on se cale sur une valeur "standard"
            var revealMs = toInt(slide.dataset.revealMs || '3500', 3500);
            if (revealMs < 1200) revealMs = 3500;
            var dur = revealMs + 1200;
            slide.style.setProperty('--kb-dur', dur + 'ms');
            slide.classList.add('kb-anim');
        } else {
            slide.classList.remove('kb-anim');
            slide.style.removeProperty('--kb-dur');
        }
    }

    var slides = document.querySelectorAll('.story-slide[data-index="' + TARGET_INDEX + '"]');
    if (!slides || !slides.length) return;

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.type !== 'attributes' || m.attributeName !== 'class') return;
            var slide = m.target;
            if (!slide.classList) return;
            applyKenBurns(slide, slide.classList.contains('active'));
        });
    });

    slides.forEach(function (slide) {
        observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
        applyKenBurns(slide, slide.classList.contains('active'));
    });
})();
