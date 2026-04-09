/* VERSION SIMPLE - Juste le strict minimum */

// MEDIA PLAYBACK HELPERS (DRY) - inspiré de script.js
function configureInlineVideo(video, options) {
    if (!video) return;
    const opts = options || {};
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    if (opts.preload) video.preload = opts.preload;
    if (typeof opts.loop === 'boolean') video.loop = opts.loop;
    if (typeof opts.muted === 'boolean') video.muted = opts.muted;
    if (typeof opts.volume === 'number') video.volume = opts.volume;
}

function normalizeAllStoryVideos() {
    const allVideos = document.querySelectorAll('.story-slide video');
    allVideos.forEach((video) => {
        const shouldLoop = video.hasAttribute('loop');
        configureInlineVideo(video, {
            preload: 'auto',
            loop: shouldLoop,
            muted: true,
            volume: 1
        });
    });
}

const mediaUnlockState = {
    unlocked: false
};

function unlockAllStoryVideos() {
    const videos = document.querySelectorAll('.story-slide video, #interludeProposalVideo');
    if (!videos.length) return;

    videos.forEach((video) => {
        if (!video) return;
        configureInlineVideo(video, {
            preload: 'auto',
            loop: video.hasAttribute('loop'),
            muted: true,
            volume: 1
        });

        try {
            const p = video.play();
            if (p && p.then) {
                p.then(() => {
                    mediaUnlockState.unlocked = true;
                    try { video.pause(); } catch (e) { }
                    try { video.currentTime = 0; } catch (e) { }
                }).catch(() => {});
            }
        } catch (e) { }
    });
}

function safePlayInlineVideo(video, options) {
    if (!video) return Promise.resolve(false);
    const opts = options || {};
    const maxAttempts = typeof opts.maxAttempts === 'number' ? opts.maxAttempts : 4;
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

    let attempts = 0;
    let resolved = false;
    let gestureArmed = false;

    function resolveOk(ok) {
        if (resolved) return;
        resolved = true;
        return ok;
    }

    function tryPlayMuted() {
        if (resolved) return Promise.resolve(true);
        attempts++;
        video.muted = true;
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
            tryPlayMuted();
        };
        document.addEventListener('pointerdown', handler, { once: true, passive: true });
        document.addEventListener('touchstart', handler, { once: true, passive: true });
        document.addEventListener('click', handler, { once: true, passive: true });
    }

    function scheduleRetry() {
        if (resolved) return;
        if (attempts >= maxAttempts) {
            armGestureRetry();
            return;
        }
        const delay = attempts === 0 ? 0 : (attempts === 1 ? 120 : 280);
        setTimeout(function () {
            tryPlayMuted().then(function (ok) {
                if (!ok) scheduleRetry();
            });
        }, delay);
    }

    return tryPlayMuted().then(function (ok) {
        if (ok) return true;
        scheduleRetry();
        armGestureRetry();
        return false;
    });
}

function primeAutoplayFromFirstGesture() {
    const primerVideo = document.querySelector('.story-slide video');
    if (!primerVideo) return;

    safePlayInlineVideo(primerVideo, {
        muted: true,
        loop: true,
        preload: 'auto',
        resetTime: true,
        maxAttempts: 4,
        gestureFallback: true
    }).then(function () {
        try { primerVideo.pause(); } catch (e) { }
        try { primerVideo.currentTime = 0; } catch (e) { }
    });
}

// SPLASH SCREEN
(function initSplash() {
    const splash = document.getElementById('splash');
    const waxSeal = document.getElementById('waxSeal');
    const flap = document.getElementById('envelopeFlap');
    const sparklesC = document.getElementById('sparkles');
    
    if (!splash || !waxSeal) return;

    // Crée les sparkles
    for (let i = 0; i < 30; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        sparklesC.appendChild(s);
    }

    function createCracks() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'seal-cracks');
        svg.setAttribute('viewBox', '0 0 122 122');
        svg.setAttribute('fill', 'none');

        const lines = [
            { x1: 61, y1: 10, x2: 55, y2: 35 },
            { x1: 55, y1: 35, x2: 65, y2: 55 },
            { x1: 65, y1: 55, x2: 58, y2: 75 },
            { x1: 58, y1: 75, x2: 63, y2: 95 },
            { x1: 63, y1: 95, x2: 60, y2: 112 },
            { x1: 55, y1: 35, x2: 35, y2: 45 },
            { x1: 65, y1: 55, x2: 85, y2: 50 },
            { x1: 58, y1: 75, x2: 38, y2: 82 },
            { x1: 63, y1: 95, x2: 80, y2: 90 }
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

    function createHalves() {
        const rect = waxSeal.getBoundingClientRect();
        const parent = waxSeal.parentElement;
        const parentRect = parent.getBoundingClientRect();
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

            setTimeout(() => half.remove(), 800);
        });
    }

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

    // Au clic sur le sceau
    function handleSealClick() {
        waxSeal.removeEventListener('click', handleSealClick);

        // Débloque l'autoplay mobile depuis la toute première interaction utilisateur.
        primeAutoplayFromFirstGesture();
        unlockAllStoryVideos();

        waxSeal.classList.add('shaking');

        setTimeout(() => {
            const cracks = createCracks();
            requestAnimationFrame(() => cracks.classList.add('visible'));
        }, 300);

        setTimeout(() => {
            createHalves();
            createFragments();
            waxSeal.classList.add('broken');
        }, 700);
        
        setTimeout(() => {
            if (flap) flap.classList.add('open');
        }, 1000);
        
        setTimeout(() => {
            splash.classList.add('hide');
            splash.style.display = 'none';
            showTitlePage();
        }, 1500);
    }

    waxSeal.addEventListener('click', handleSealClick);
})();

// TITLE PAGE
function showTitlePage() {
    const titlePage = document.getElementById('titlePage');
    if (!titlePage) return;
    
    // Démarre la musique automatiquement
    const bgMusic = document.getElementById('bgMusic');
    if (bgMusic && bgMusic.paused) {
        bgMusic.volume = 0.08;
        bgMusic.muted = false;
        try { bgMusic.play().catch(() => {}); } catch (e) { }
    }
    
    // Synchronise l'icône du bouton audio
    updateAudioButtonState();
    
    titlePage.classList.add('visible');
    
    setTimeout(() => {
        titlePage.classList.add('hide');
        titlePage.style.display = 'none';
        startStories();
    }, 4000);
}

// VIDEO INTERLUDE - Vidéo + gestion du son (pause avant, reprend après)
function showVideoInterlude(interludeId, videoId, onPrevClick, onDone) {
    const el = document.getElementById(interludeId);
    const video = document.getElementById(videoId);
    const bgMusic = document.getElementById('bgMusic');
    const shouldResumeBgMusic = !!bgMusic && !bgMusic.muted;
    const prevBtn = document.getElementById('interludePrevBtn');
    const nextBtn = document.getElementById('interludeNextBtn');
    const unmuteBtn = document.getElementById('interludeUnmuteBtn');
    
    if (!el || !video) {
        if (onDone) onDone();
        return;
    }
    
    let done = false;
    
    function finish() {
        if (done) return;
        done = true;
        
        try { video.pause(); } catch (e) { }
        video.onended = null;
        if (prevBtn) prevBtn.onclick = null;
        if (nextBtn) nextBtn.onclick = null;
        if (unmuteBtn) unmuteBtn.onclick = null;
        
        el.style.display = 'none';
        el.classList.remove('visible');
        el.style.opacity = '0';
        
        // Reprend la musique de fond si elle était active
        if (bgMusic && shouldResumeBgMusic) {
            bgMusic.muted = false;
            bgMusic.volume = 0.08;
            try { bgMusic.play().catch(() => {}); } catch (e) { }
        }
        
        // Synchronise l'icône du bouton audio après l'interlude
        updateAudioButtonState();
        
        if (onDone) onDone();
    }
    
    // Affiche l'interlude
    el.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.classList.add('visible');
            el.style.opacity = '1';
        });
    });
    
    // Pause la musique de fond
    if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
    }
    
    // Reset vidéo et lance la lecture (muted pour compat mobile)
    try { video.currentTime = 0; } catch (e) { }
    video.muted = true;
    video.volume = 1;
    video.onended = finish;

    configureInlineVideo(video, {
        preload: 'auto',
        loop: false,
        muted: true,
        volume: 1
    });

    safePlayInlineVideo(video, {
        muted: true,
        loop: false,
        preload: 'auto',
        resetTime: true,
        maxAttempts: 4,
        gestureFallback: true,
        displayBlock: true
    });

    if (unmuteBtn) {
        unmuteBtn.style.display = 'inline-flex';
        unmuteBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            try { video.muted = false; } catch (err) { }
            try { video.volume = 1; } catch (err) { }
            try { video.play().catch(() => {}); } catch (err) { }
            unmuteBtn.style.display = 'none';
        };
    }
    
    // Boutons de navigation
    if (prevBtn) {
        prevBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            finish();
            if (onPrevClick) onPrevClick();
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            finish();
        };
    }
}

// ENHANCE VIDEO COLLAGES - Fonction générique (DRY) pour tous les collages
// S'applique à tout slide avec .video-collage (slide 3, 10, etc.)
function enhanceVideoCollages() {
    const collageSlides = document.querySelectorAll('.story-slide:not([data-collage-enhanced]) .video-collage');
    if (!collageSlides || collageSlides.length === 0) return;
    
    collageSlides.forEach(function (collageContainer) {
        const slide = collageContainer.closest('.story-slide');
        if (slide.__collageEnhanced) return;
        
        const videos = Array.from(collageContainer.querySelectorAll('video.collage-video'));
        if (!videos.length) return;
        
        videos.forEach(function (videoEl) {
            if (!videoEl || videoEl.closest('.collage-tile')) return;
            
            const tile = document.createElement('div');
            tile.className = 'collage-tile';
            
            // Create background clone (blurred video for better visuals)
            const bg = document.createElement('video');
            bg.className = 'collage-video-bg';
            bg.autoplay = true;
            bg.muted = true;
            bg.loop = true;
            bg.playsInline = true;
            bg.setAttribute('playsinline', '');
            bg.setAttribute('webkit-playsinline', '');
            
            // Copy sources from original video
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
            
            // Wrap: tile becomes the new container
            const parent = videoEl.parentNode;
            parent.insertBefore(tile, videoEl);
            tile.appendChild(bg);
            tile.appendChild(videoEl);
            
            // Start bg playback (best effort)
            try { bg.load(); } catch (e) { }
            const p = bg.play();
            if (p && p.catch) p.catch(function () { });
        });
        
        slide.__collageEnhanced = true;
    });
}

// STORIES
function startStories() {
    const container = document.getElementById('storiesContainer');
    const slides = container.querySelectorAll('.story-slide');
    const dots = container.querySelectorAll('.stories-dots .dot');
    const navLeft = document.getElementById('storyNavLeft');
    const navRight = document.getElementById('storyNavRight');
    
    if (!container || slides.length === 0) return;
    
    let currentIndex = 0;
    let autoplayTimer = null;
    const slideTimers = new Map(); // Stocke les timers pour chaque slide
    let prevIndex = -1; // Garde l'index précédent pour détecter les transitions
    let currentSlideDuration = 5000; // Durée par défaut, ajustée dynamiquement
    
    container.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Enhance tous les collages vidéo (slide 3, 10, etc.) - Fonction générique (DRY)
    enhanceVideoCollages();
    normalizeAllStoryVideos();
    
    // Prépare le texte "reveal words"
    function prepareRevealText(slide) {
        const revealEl = slide.querySelector('.reveal-words');
        if (!revealEl || revealEl.__prepared) return;
        
        const text = revealEl.textContent.trim();
        const words = text.split(/\s+/);
        revealEl.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
        revealEl.__prepared = true;
    }
    
    // Annule tous les timers d'un slide
    function cancelSlideTimers(slide) {
        const timers = slideTimers.get(slide);
        if (timers && timers.length) {
            timers.forEach(tid => clearTimeout(tid));
            slideTimers.set(slide, []);
        }
    }

    function preloadNextSlideVideos(slide) {
        if (!slide) return;
        const indexAttr = slide.getAttribute('data-index');
        const currentIdx = Number(indexAttr);
        if (Number.isNaN(currentIdx)) return;
        const nextSlide = slides[currentIdx + 1];
        if (!nextSlide) return;

        const videos = nextSlide.querySelectorAll('video');
        videos.forEach((video) => {
            if (!video) return;
            configureInlineVideo(video, {
                preload: 'auto',
                loop: video.hasAttribute('loop'),
                muted: true,
                volume: 1
            });
        });
    }

    function getSlideVideoStartDelay(slide, defaultDelay) {
        if (!slide) return defaultDelay;
        const idx = Number(slide.getAttribute('data-index'));
        if (Number.isNaN(idx)) return defaultDelay;

        // Slides 3, 5 and 6 (indexes 2, 4, 5) need faster start to match text.
        if (idx === 2 || idx === 4 || idx === 5) return 0;

        return defaultDelay;
    }
    
    // Lance le texte progressif
    function startRevealAnimation(slide) {
        const revealEl = slide.querySelector('.reveal-words');
        const captionEl = slide.querySelector('.reveal-caption');
        
        if (!revealEl) {
            if (captionEl) captionEl.classList.add('visible');
            preloadNextSlideVideos(slide);
            scheduleSlideMediaStart(slide, getSlideVideoStartDelay(slide, 0));
            return;
        }
        
        // Réinitialise et annule les anciens timers
        const allWords = revealEl.querySelectorAll('.word');
        allWords.forEach(w => w.classList.remove('visible'));
        cancelSlideTimers(slide);
        preloadNextSlideVideos(slide);
        const newTimers = [];
        
        const words = revealEl.querySelectorAll('.word');
        const perWordDelay = words.length > 0 ? 3500 / words.length : 300;
        
        words.forEach((word, i) => {
            const tid = setTimeout(() => {
                if (slide.classList.contains('active')) {
                    word.classList.add('visible');
                }
            }, 400 + i * perWordDelay);
            newTimers.push(tid);
        });
        
        if (captionEl) {
            captionEl.classList.remove('visible');
            const tid = setTimeout(() => {
                if (slide.classList.contains('active')) {
                    captionEl.classList.add('visible');
                }
            }, 400 + words.length * perWordDelay + 300);
            newTimers.push(tid);
        }
        
        // Démarre les vidéos immédiatement (pas de délai pour sync parfaite)
        scheduleSlideMediaStart(slide, 0);

        // Calcule la durée totale de l'animation pour sync slide
        const totalAnimationDuration = 400 + words.length * perWordDelay + 600;
        currentSlideDuration = totalAnimationDuration + 1000; // Buffer pour lecture

        // Déclenche le zoom sur image du slide 13 pendant le reveal (DRY + SOLID)
        const bgImage = slide.querySelector('.story-bg-image');
        if (bgImage && slide.getAttribute('data-index') === '12') {
            // Démarre le zoom au même moment que le texte
            bgImage.classList.add('zooming');
            
            // Arrête le zoom une fois que la caption est affichée
            const zoomEndTimer = setTimeout(() => {
                if (slide.classList.contains('active')) {
                    bgImage.classList.remove('zooming');
                }
            }, totalAnimationDuration);
            newTimers.push(zoomEndTimer);
        }
        
        slideTimers.set(slide, newTimers);
    }
    
    // Joue la vidéo du slide
    function playSlideVideos(slide) {
        if (!slide) return;
        const videos = slide.querySelectorAll('video');
        videos.forEach((video) => {
            if (!video) return;

            // Idempotent: ne relance pas une vidéo déjà en lecture.
            if (video.currentTime > 0 && !video.paused && !video.ended) return;

            if (mediaUnlockState.unlocked) {
                try { video.muted = true; } catch (e) { }
                try { video.play().catch(() => {}); } catch (e) { }
            } else {
                safePlayInlineVideo(video, {
                    muted: true,
                    loop: video.hasAttribute('loop'),
                    preload: 'auto',
                    resetTime: false,
                    maxAttempts: 4,
                    gestureFallback: true
                });
            }
        });
    }

    function scheduleSlideMediaStart(slide, baseDelay) {
        if (!slide) return;
        const delays = [baseDelay, baseDelay + 140, baseDelay + 380];
        delays.forEach((delay) => {
            setTimeout(() => {
                if (slide.classList.contains('active')) {
                    playSlideVideos(slide);
                }
            }, delay);
        });
    }
    
    // Arrête les vidéos
    function stopSlideVideos(slide) {
        const videos = slide.querySelectorAll('video');
        videos.forEach(video => {
            try {
                video.pause();
                video.currentTime = 0;
            } catch (e) {}
        });
    }
    
    // Relance les vidéos jusqu'à fin du texte reveal (DRY + SOLID)
    function ensureVideoPlaysUntilTextComplete(slide) {
        if (!slide.classList.contains('active')) return;
        
        const captionEl = slide.querySelector('.reveal-caption');
        const revealEl = slide.querySelector('.reveal-words');
        
        // Si pas de texte, rien à faire
        if (!revealEl && !captionEl) return;
        
        const videos = slide.querySelectorAll('video');
        if (!videos.length) return;
        
        // Flag pour éviter les boucles infinies
        let loopCount = 0;
        const MAX_LOOPS = 5;
        
        videos.forEach(video => {
            // Enlève les anciens listeners (DRY)
            if (video.__videoEndedHandler) {
                video.removeEventListener('ended', video.__videoEndedHandler);
            }
            
            // Crée le handler de relance
            const handleVideoEnded = () => {
                if (!slide.classList.contains('active')) return;
                
                // Vérifie si le texte est complet
                const textComplete = captionEl && captionEl.classList.contains('visible');
                
                if (!textComplete && loopCount < MAX_LOOPS) {
                    loopCount++;
                    safePlayInlineVideo(video, {
                        muted: true,
                        loop: false,
                        preload: 'auto',
                        resetTime: true,
                        maxAttempts: 3,
                        gestureFallback: true
                    });
                }
            };
            
            // Stocke le handler pour pouvoir le nettoyer plus tard
            video.__videoEndedHandler = handleVideoEnded;
            video.addEventListener('ended', handleVideoEnded);
        });
    }
    
    function showSlide(index) {
        if (index >= slides.length) {
            // Fin des stories - affiche la section infos
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.display = 'none';
                document.body.style.overflow = 'auto';
                document.getElementById('info-section').classList.add('visible-section');
            }, 600);
            return;
        }
        if (index < 0) index = 0;
        
        // INTERLUDE VIDÉO : Si passage de slide 7 à 8, affiche l'interlude en premier
        if (prevIndex === 7 && index === 8) {
            clearTimeout(autoplayTimer);
            slides.forEach(slide => slide.classList.remove('active'));
            
            showVideoInterlude('interludeProposal', 'interludeProposalVideo', 
                function onPrev() {
                    // Bouton "Précédent" = retour au slide 7
                    showSlide(7);
                },
                function onDone() {
                    // Après l'interlude, affiche le slide 8
                    currentIndex = 8;
                    showSlideContent(8);
                }
            );
            prevIndex = index;
            return;
        }
        
        currentIndex = index;
        prevIndex = index;
        showSlideContent(index);
    }
    
    function showSlideContent(index) {
        currentIndex = index;
        
        // Arrête les anciennes vidéos et annule les timers
        slides.forEach((slide, i) => {
            if (i !== currentIndex) {
                stopSlideVideos(slide);
                cancelSlideTimers(slide);
                // Nettoie les listeners de relance vidéo
                const videos = slide.querySelectorAll('video');
                videos.forEach(video => {
                    if (video.__videoEndedHandler) {
                        video.removeEventListener('ended', video.__videoEndedHandler);
                        video.__videoEndedHandler = null;
                    }
                });
                // Réinitialise le texte
                const words = slide.querySelectorAll('.reveal-words .word');
                words.forEach(w => w.classList.remove('visible'));
                const caption = slide.querySelector('.reveal-caption');
                if (caption) caption.classList.remove('visible');
                // Nettoie l'animation de zoom sur l'image (DRY)
                const bgImage = slide.querySelector('.story-bg-image');
                if (bgImage) bgImage.classList.remove('zooming');
            }
        });
        
        // Cache tous les slides
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Affiche le slide courant
        const currentSlide = slides[currentIndex];
        currentSlide.classList.add('active');
        if (dots[currentIndex]) dots[currentIndex].classList.add('active');
        
        // Prépare et lance le texte
        prepareRevealText(currentSlide);
        startRevealAnimation(currentSlide);
        
        // Les vidéos sont synchronisées avec le texte via startRevealAnimation (DRY)
        
        // S'assure que les vidéos se rejouent jusqu'à fin du texte (DRY)
        ensureVideoPlaysUntilTextComplete(currentSlide);
        
        // Lance le prochain slide après la durée du texte + buffer
        clearTimeout(autoplayTimer);
        autoplayTimer = setTimeout(() => {
            showSlide(currentIndex + 1);
        }, currentSlideDuration);
    }
    
    // Navigation au tap
    if (navLeft) {
        navLeft.addEventListener('click', () => {
            showSlide(currentIndex - 1);
        });
    }
    if (navRight) {
        navRight.addEventListener('click', () => {
            showSlide(currentIndex + 1);
        });
    }
    
    // Démarre le premier slide
    showSlide(0);
}

// AUDIO BUTTON & STATE SYNC - Synchronise l'icône avec l'état réel (DRY pattern)
function updateAudioButtonState() {
    const audioBtn = document.getElementById('audioBtn');
    const bgMusic = document.getElementById('bgMusic');
    const iconUnmute = document.getElementById('icon-unmute');
    const iconMute = document.getElementById('icon-mute');
    
    if (!audioBtn || !bgMusic || !iconUnmute || !iconMute) return;
    
    // Si la musique joue, affiche l'icône "volume on"
    const isPlaying = bgMusic && !bgMusic.paused && !bgMusic.muted;
    if (isPlaying) {
        iconUnmute.style.display = 'block';
        iconMute.style.display = 'none';
        audioBtn.classList.add('playing');
    } else {
        iconUnmute.style.display = 'none';
        iconMute.style.display = 'block';
        audioBtn.classList.remove('playing');
    }
}

// Initialise le bouton audio (appelé au DOMContentLoaded)
document.addEventListener('DOMContentLoaded', function() {
    const audioBtn = document.getElementById('audioBtn');
    const bgMusic = document.getElementById('bgMusic');
    
    if (!audioBtn || !bgMusic) return;
    
    // Click handler : toggle audio et sync l'icône
    audioBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (bgMusic.paused) {
            bgMusic.volume = 0.08;
            bgMusic.muted = false;
            try { bgMusic.play().catch(() => {}); } catch (e) { }
        } else {
            bgMusic.pause();
        }
        
        // Synchronise immédiatement l'icône après le clic
        updateAudioButtonState();
    });
    
    // Sync aussi quand la musique se termine ou change d'état
    bgMusic.addEventListener('play', updateAudioButtonState);
    bgMusic.addEventListener('pause', updateAudioButtonState);
    bgMusic.addEventListener('ended', updateAudioButtonState);
    
    // État initial
    updateAudioButtonState();
});

// SCROLL HINT BUTTON - Synchronise l'état avec la position de scroll (DRY pattern)
function updateScrollHintState() {
    const btn = document.getElementById('scrollHintBtn');
    if (!btn) return;
    
    const scrollY = window.scrollY;
    const threshold = 200; // Seuil pour considérer "en bas"
    
    if (scrollY < threshold) {
        // En haut : flèche vers le bas, pulsing, non cliquable
        btn.textContent = '↓';
        btn.classList.add('at-top');
        btn.classList.remove('at-bottom');
        btn.setAttribute('aria-label', 'Il y a du contenu plus bas');
    } else {
        // En bas : flèche vers le haut, cliquable
        btn.textContent = '↑';
        btn.classList.remove('at-top');
        btn.classList.add('at-bottom');
        btn.setAttribute('aria-label', 'Remonter en haut');
    }
    
    // Rendre visible après le splash
    if (!btn.classList.contains('visible')) {
        btn.classList.add('visible');
    }
}

// Initialise le bouton scroll hint (appelé au DOMContentLoaded)
document.addEventListener('DOMContentLoaded', function() {
    const scrollHintBtn = document.getElementById('scrollHintBtn');
    const infoSection = document.getElementById('info-section');
    
    if (scrollHintBtn && infoSection) {
        // Observer pour montrer le bouton seulement quand la section info est visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    scrollHintBtn.classList.add('visible');
                    updateScrollHintState(); // Met à jour l'état initial
                } else {
                    scrollHintBtn.classList.remove('visible');
                }
            });
        }, { threshold: 0.1 }); // 10% visible
        
        observer.observe(infoSection);
        
        // Click handler : scroll to top si en bas
        scrollHintBtn.addEventListener('click', function() {
            if (scrollHintBtn.classList.contains('at-bottom')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
        // Listener pour le scroll
        window.addEventListener('scroll', updateScrollHintState, { passive: true });
    }
});

// COUNTDOWN
const weddingDate = new Date('2026-04-18T17:00:00');

function updateCountdown() {
    const now = new Date();
    const diff = weddingDate - now;
    
    if (diff <= 0) {
        document.getElementById('cd-days').textContent = '0';
        document.getElementById('cd-hours').textContent = '0';
        document.getElementById('cd-mins').textContent = '0';
        document.getElementById('cd-secs').textContent = '0';
        return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    
    document.getElementById('cd-days').textContent = days;
    document.getElementById('cd-hours').textContent = hours;
    document.getElementById('cd-mins').textContent = mins;
    document.getElementById('cd-secs').textContent = secs;
}

updateCountdown();
setInterval(updateCountdown, 1000);

// INTERSECTION OBSERVER
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll('.fade-in, .scale-in, .tl-item').forEach(el => {
    observer.observe(el);
});

// MUSIC CONTROL - Pause/Resume with Page Visibility API
let wasPlaying = false;
const audio = document.querySelector("audio");

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    // Sauvegarder si la musique jouait
    wasPlaying = !audio.paused;
    audio.pause();
  } 
  
  else if (document.visibilityState === "visible") {
    // Reprendre SEULEMENT si elle jouait avant
    if (wasPlaying) {
      audio.play().catch(() => {
        console.log("Lecture bloquée, attente interaction utilisateur");
      });
    }
  }
});

// Débloquer l'audio sur interaction utilisateur
document.addEventListener("click", () => {
  audio.play().catch(() => {});
}, { once: true });

// Supprimer les doublons de signature
const elements = document.querySelectorAll('div, span, p');
elements.forEach(el => {
  if (el.textContent.includes("Made with ❤️ by Sadiya") && el.id !== "signature-bottom") {
    el.remove();
  }
});

// Montrer le crédit seulement quand la section info est visible
const credit = document.getElementById('signature-bottom');
const infoSection = document.getElementById('info-section');
if (credit && infoSection) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        credit.style.opacity = '1';
        credit.style.visibility = 'visible';
      }
    });
  }, { threshold: 0.1 });
  observer.observe(infoSection);
}
