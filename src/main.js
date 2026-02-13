import './style.css';

const app = document.getElementById('app');
const API_BASE_URL = '';

// Router Logic
function handleRoute() {
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        renderLoginPage();
    } else if (path === '/create') {
        // PROTECTED: Starts creation flow, requires login check inside renderCreatePage
        renderCreatePage();
    } else if (path.startsWith('/v1/')) {
        // PUBLIC: Valentine pages are public, no login required
        const slug = path.split('/v1/')[1];
        renderValentinePage(slug);
    } else {
        // Handling unknown routes or 404 in SPA 
        // Usually invalid slug leads to 404 from API
        // If route path is weird, we can show 404
        render404('Page Not Found');
    }
}

// Navigate function to push state
function navigate(url) {
    window.history.pushState({}, '', url);
    handleRoute();
}

// Handle browser back/forward
window.addEventListener('popstate', handleRoute);

// Render Login Page
function renderLoginPage() {
    // Check if simple session exists (very basic)
    if (localStorage.getItem('user_email')) {
        navigate('/create');
        return;
    }

    app.innerHTML = `
    <div class="container login-container">
        <h1>Valentine Page Builder 💖</h1>
        <p class="subtitle" id="auth-subtitle">Login to create something special.</p>
        
        <div class="auth-box">
             <div class="input-group">
                <label>Email</label>
                <input type="text" id="email" placeholder="you@love.com">
             </div>
             <div class="input-group">
                <label>Password</label>
                <input type="password" id="password" placeholder="••••••">
             </div>
             
             <button id="login-btn" class="btn">Enter Studio ✨</button>
             
        </div>
    </div>
    `;

    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const actionBtn = document.getElementById('login-btn');
    const subtitle = document.getElementById('auth-subtitle');


    // Toggle Mode

    // Handle Auth
    actionBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        actionBtn.disabled = true;
        actionBtn.textContent = 'Processing...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('user_email', data.email);
                navigate('/create');
            } else {
                alert(data.error || 'Auth failed');
                actionBtn.disabled = false;
                actionBtn.textContent = "Enter Studio ✨";
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
            actionBtn.disabled = false;
            actionBtn.textContent = "Enter Studio ✨";
        }
    });
}

// Render Creation Page
function renderCreatePage() {
    // State for image positions and files
    // We need to keep track of files and their positions manually since we're adding reordering
    let imageState = Array(6).fill(null).map(() => ({ file: null, preview: '', position: '50% 50%', zoom: 1 }));

    function renderImageGrid() {
        const grid = document.getElementById('image-grid');
        if (!grid) return;

        grid.innerHTML = imageState.map((item, i) => `
          <div class="image-slot-wrapper" data-index="${i}">
              <div class="image-slot" data-has-preview="${item.preview ? 'true' : 'false'}">
                ${item.preview ? `<img src="${item.preview}" style="object-position: ${item.position}; transform: scale(${item.zoom})" draggable="false">` : '<span class="placeholder">+</span>'}
                <input type="file" accept="image/*" class="file-input" ${!item.preview ? '' : 'style="display:none"'} data-index="${i}">
              </div>
              ${item.preview ? `<div class="zoom-controls">
                  <button type="button" class="ctrl-btn zoom-out-btn" title="Zoom Out">−</button>
                  <span class="zoom-label">${Math.round(item.zoom * 100)}%</span>
                  <button type="button" class="ctrl-btn zoom-in-btn" title="Zoom In">+</button>
              </div>` : ''}
              <div class="image-controls" ${!item.preview ? 'style="display:none"' : ''}>
                  <button type="button" class="ctrl-btn move-left" ${i === 0 ? 'disabled' : ''} title="Move Left">←</button>
                  <button type="button" class="ctrl-btn move-right" ${i === 5 ? 'disabled' : ''} title="Move Right">→</button>
                  <button type="button" class="ctrl-btn delete-btn" title="Remove">×</button>
              </div>
          </div>
        `).join('');

        // Re-attach listeners
        grid.querySelectorAll('.file-input').forEach(input => {
            input.addEventListener('change', (e) => handleFileSelect(e, parseInt(input.dataset.index)));
        });

        // Make empty slots clickable to trigger the hidden file input
        grid.querySelectorAll('.image-slot').forEach(slot => {
            if (slot.dataset.hasPreview === 'true') return; // skip slots with images
            slot.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                const input = slot.querySelector('.file-input');
                if (input) input.click();
            });
        });

        // Drag-to-reposition on image slots that have images
        grid.querySelectorAll('.image-slot[data-has-preview="true"]').forEach(slot => {
            const wrapper = slot.closest('.image-slot-wrapper');
            const idx = parseInt(wrapper.dataset.index);
            const img = slot.querySelector('img');
            if (!img) return;

            let isDragging = false;
            let startX, startY, startPosX, startPosY;

            const parsePosition = (pos) => {
                const parts = pos.split(' ');
                return {
                    x: parseFloat(parts[0]) || 50,
                    y: parseFloat(parts[1]) || 50
                };
            };

            const onStart = (clientX, clientY) => {
                isDragging = true;
                startX = clientX;
                startY = clientY;
                const pos = parsePosition(imageState[idx].position);
                startPosX = pos.x;
                startPosY = pos.y;
                slot.style.cursor = 'grabbing';
            };

            const onMove = (clientX, clientY) => {
                if (!isDragging) return;
                const rect = slot.getBoundingClientRect();
                const dx = ((clientX - startX) / rect.width) * 100;
                const dy = ((clientY - startY) / rect.height) * 100;
                // Invert: dragging right moves object-position left (shows right side)
                const newX = Math.max(0, Math.min(100, startPosX - dx));
                const newY = Math.max(0, Math.min(100, startPosY - dy));
                const newPos = `${newX.toFixed(1)}% ${newY.toFixed(1)}%`;
                imageState[idx].position = newPos;
                img.style.objectPosition = newPos;
            };

            const onEnd = () => {
                isDragging = false;
                slot.style.cursor = 'grab';
            };

            // Mouse events
            slot.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientX, e.clientY); });
            document.addEventListener('mousemove', (e) => { onMove(e.clientX, e.clientY); });
            document.addEventListener('mouseup', onEnd);

            // Touch events
            slot.addEventListener('touchstart', (e) => { const t = e.touches[0]; onStart(t.clientX, t.clientY); }, { passive: true });
            document.addEventListener('touchmove', (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); });
            document.addEventListener('touchend', onEnd);

            slot.style.cursor = 'grab';
        });

        grid.querySelectorAll('.move-left').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.closest('.image-slot-wrapper').dataset.index);
                if (idx > 0) swapImages(idx, idx - 1);
            });
        });

        grid.querySelectorAll('.move-right').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.closest('.image-slot-wrapper').dataset.index);
                if (idx < 5) swapImages(idx, idx + 1);
            });
        });

        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.closest('.image-slot-wrapper').dataset.index);
                deleteImage(idx);
            });
        });

        // Zoom controls
        grid.querySelectorAll('.zoom-in-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.closest('.image-slot-wrapper').dataset.index);
                zoomImage(idx, 0.2);
            });
        });

        grid.querySelectorAll('.zoom-out-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.closest('.image-slot-wrapper').dataset.index);
                zoomImage(idx, -0.2);
            });
        });
    }

    function handleFileSelect(e, index) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                imageState[index].file = file;
                imageState[index].preview = ev.target.result;
                imageState[index].position = '50% 50%'; // Reset position on new upload
                imageState[index].zoom = 1; // Reset zoom on new upload
                renderImageGrid();
            };
            reader.readAsDataURL(file);
        }
    }

    function swapImages(idx1, idx2) {
        const temp = imageState[idx1];
        imageState[idx1] = imageState[idx2];
        imageState[idx2] = temp;
        renderImageGrid();
    }

    function deleteImage(index) {
        imageState[index] = { file: null, preview: '', position: '50% 50%', zoom: 1 };
        renderImageGrid();
    }

    function zoomImage(index, delta) {
        const newZoom = Math.round((imageState[index].zoom + delta) * 10) / 10;
        imageState[index].zoom = Math.max(0.5, Math.min(3, newZoom)); // Clamp between 0.5x and 3x
        // Live update without full re-render
        const img = document.querySelector(`.image-slot-wrapper[data-index="${index}"] .image-slot img`);
        const label = document.querySelector(`.image-slot-wrapper[data-index="${index}"] .zoom-label`);
        if (img) img.style.transform = `scale(${imageState[index].zoom})`;
        if (label) label.textContent = `${Math.round(imageState[index].zoom * 100)}%`;
    }

    app.innerHTML = `
    <div class="container">
      <h1>Valentine Page Builder 💖</h1>
      <form id="create-form">
        <div class="input-group">
          <label>Your Custom Slug</label>
          <input type="text" id="slug" placeholder="e.g. forever-us (lower case, numbers, hyphens)" required pattern="[a-z0-9-]+">
        </div>

        <div class="input-group">
          <label>Upload 6 Sweet Memories</label>
          <p class="hint">Upload images, drag to reposition, use arrows to reorder, and +/− to zoom.</p>
          <div class="image-grid" id="image-grid">
             <!-- Rendered via JS -->
          </div>
        </div>

        <button type="submit" class="btn">Create My Page ✨</button>
      </form>
    </div>
  `;

    renderImageGrid();

    // Handle Submit
    document.getElementById('create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');

        // Validate
        if (imageState.some(img => !img.file)) {
            alert("Please upload all 6 images!");
            return;
        }

        btn.textContent = 'Creating... 💖 (Please Wait)';
        btn.disabled = true;

        const slug = document.getElementById('slug').value.trim();

        // Client-side Slug Regex Check
        if (!/^[a-z0-9-]+$/.test(slug)) {
            alert("Slug must contain only lowercase letters, numbers, and hyphens.");
            btn.textContent = 'Create My Page ✨';
            btn.disabled = false;
            return;
        }

        const formData = new FormData();
        formData.append('slug', slug);

        // Append images, positions, and zooms
        const positions = [];
        const zooms = [];
        imageState.forEach(item => {
            formData.append('images', item.file);
            positions.push(item.position);
            zooms.push(item.zoom);
        });
        formData.append('imagePositions', JSON.stringify(positions));
        formData.append('imageZooms', JSON.stringify(zooms));

        try {
            const res = await fetch(`${API_BASE_URL}/api/pages`, {
                method: 'POST',
                body: formData
            });

            // Improved Error Handling
            if (res.ok) {
                const data = await res.json();
                navigate(`/v1/${data.slug}`);
            } else {
                let errorMsg = 'Something went wrong';
                try {
                    const errorText = await res.text();
                    const errorJson = JSON.parse(errorText);
                    errorMsg = errorJson.error || errorMsg;
                } catch (parseErr) {
                    console.error("Failed to parse error response", parseErr);
                }

                alert(`Upload Failed: ${errorMsg}`);
                console.error('Upload failed response:', res.status, errorMsg);
                btn.textContent = 'Create My Page ✨';
                btn.disabled = false;
            }
        } catch (err) {
            console.error('Network or logic error during create:', err);
            alert(`Network error: ${err.message}. Check console.`);
            btn.textContent = 'Create My Page ✨';
            btn.disabled = false;
        }
    });
}

// Render Valentine Page
async function renderValentinePage(slug) {
    app.innerHTML = '<div class="container"><h1>Loading Love... 💕</h1></div>';
    document.body.classList.add('valentine-theme');

    try {
        const res = await fetch(`${API_BASE_URL}/api/pages/${slug}`);
        if (!res.ok) {
            throw new Error('Page not found');
        }
        const data = await res.json();

        // 1. Prepare Gallery HTML (Gift 3)
        // We expect up to 6 images. If fewer, we might need to handle empty slots or loop.
        const captions = ["I", "Love", "You", "Forever", "And", "Ever"];
        const rotations = ["-3deg", "2deg", "-4deg", "3deg", "-4deg", "3deg"];

        // Default positions and zooms if old data
        const positions = data.imagePositions || Array(data.images.length).fill('center center');
        const zooms = data.imageZooms || Array(data.images.length).fill(1);

        const galleryHtml = data.images.map((img, i) => `
            <div class="polaroid" style="--r:${rotations[i % rotations.length]}">
                <img src="${API_BASE_URL}${img}" alt="Memory ${i + 1}" style="object-position: ${positions[i] || 'center center'}; transform: scale(${zooms[i] || 1})">
                <p class="photo-caption">${captions[i] || 'Love'}</p>
            </div>
        `).join('');

        // 2. Prepare Video HTML (Final Page) - local video, plays on "Finally" click
        const videoContent = `
            <video id="finalVideo" width="350" height="500" controls loop playsinline preload="auto" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); object-fit: cover;">
                <source src="/videoplayback.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;


        // 3. Render Full Template
        app.innerHTML = `
            <div class="valentine-wrapper">
                <div class="bg-animation" id="bgAnim"></div>
                <canvas id="fireworksCanvas"></canvas>
                <div class="heart-burst" id="burst"></div>

                <div class="valentine-container">
                    
                    <!-- PAGE 1: PROPOSAL -->
                    <div id="page1" class="valentine-page active">
                        <img id="mainGif" class="main-gif" src="https://media.tenor.com/K0Op-0SpsvkAAAAi/dudu-cute.gif">
                        <h1>Will you be mine 🥺?</h1>
                        <p class="romantic-text">Life is an incredible journey, and I want to spend every single second of it with you.</p>
                        <div class="btn-wrap">
                            <button class="val-btn" id="yesBtn">YES</button>
                            <button class="val-btn" id="noBtn">No</button>
                        </div>
                    </div>

                    <!-- PAGE 2: HAPPY PROPOSE DAY -->
                    <div id="pageProposeDay" class="valentine-page">
                        <img class="main-gif" src="https://media.tenor.com/Zrr4L_Wd4JkAAAAi/bubu-rub-bubu-love-dudu.gif">
                        <h1 style="color: #4a0e1c;">Happy Valentine's Day Baby! 💍</h1>
                        <p class="romantic-text">
                            Every second with you is a celebration. You are the spark that makes my world so much brighter!
                        </p>
                        <button class="val-btn nav-btn" data-target="pageCards">See My Gifts →</button>
                    </div>

                    <!-- PAGE 3: DASHBOARD -->
                    <div id="pageCards" class="valentine-page">
                        <h1>Something for You</h1>
                        <div class="selection-grid">
                            <div class="col-card" data-target="pageQuiz">
                                <img src="https://media.tenor.com/_F868yNBTPEAAAAj/kiss-kissing.gif" class="gif-icon">
                                <h3>Gift 1</h3>
                            </div>
                            <div class="col-card" data-target="pageLetter">
                                <img src=" https://media.tenor.com/4NhqI8XyoPwAAAAi/quby-hearts.gif" class="gif-icon">
                                <h3>Gift 2</h3>
                            </div>
                            <div class="col-card" data-target="pageGallery">
                                <img src=" https://media.tenor.com/H_u4zlHSRUoAAAAi/love-delivery.gif" class="gif-icon">
                                <h3>Gift 3</h3>
                            </div>
                        </div>
                        <button class="val-btn nav-btn" style="background:red; border:1px solid #ff4d6d; color:white;" id="finalBtn">Finally... ✨</button>
                    </div>

                    <!-- PAGE: GALLERY -->
                    <div id="pageGallery" class="valentine-page">
                        <h1>These memories remind me that loving you is my favorite story.</h1>
                        <div class="gallery-grid">
                            ${galleryHtml}
                        </div>
                        <button class="val-btn nav-btn" data-target="pageCards">← Back</button>
                    </div>

                    <!-- PAGE: LETTER -->
                    <div id="pageLetter" class="valentine-page">
                        <h1>A Letter For You 🥺</h1>
                        <div class="letter-paper">
                             My Valentine ♥️,<br><br>
                            From the moment you came into my life,
                            everything feels a little brighter and a lot more beautiful.
                            The time we spend together has turned into my favorite memories, 
                            and each one reminds me how special you truly are.
                            Your smile, your kindness, and the way you understand me make my heart feel safe and full of love. 
                            I don’t just admire you  I genuinely cherish you.
                            This Valentine’s Day, I just want you to know that my feelings are real, my intentions are pure, and my heart chooses you today and always.
                             <br><br>
                            Forever yours. ❤️
                        </div>
                        <button class="val-btn nav-btn" data-target="pageCards">← Back</button>
                    </div>

                    <!-- PAGE: QUIZ -->
                    <div id="pageQuiz" class="valentine-page">
                        <h1>Quiz for you 😚</h1>
                        <div class="quiz-container" id="quiz-box"></div>
                        <div id="quiz-feedback"></div>
                        <button class="val-btn nav-btn" data-target="pageCards">← Back</button>
                    </div>

                    <!-- PAGE: FINAL -->
                    <div id="pageFinal" class="valentine-page">
                        <h1>You are my forever 🧿💛</h1>
                        ${videoContent}
                        <p class="romantic-text">I love you more than words can say. 💛
                            <br>
                            No matter where life takes us, my heart will always choose you.<br>
                            Thank you for being my peace, my smile, my love.<br>
                            I loved you yesterday. I love you today. I will love you tomorrow .<br> You are my forever 💛🌏
                        </p>
                    </div>

                </div>
            </div>
        `;

        // 4. Initialize Interactive Scripts
        initializeValentineScripts();

    } catch (err) {
        console.error(err);
        render404();
    }
}

function initializeValentineScripts() {
    let currentActivePage = 'page1';

    // Helper to switch pages
    const nextPage = (id) => {
        currentActivePage = id;
        document.querySelectorAll('.valentine-page').forEach(p => p.classList.remove('active', 'popup-active'));
        const target = document.getElementById(id);
        if (id === 'pageProposeDay') target.classList.add('popup-active');
        else target.classList.add('active');

        const canvas = document.getElementById('fireworksCanvas');
        if (canvas) canvas.style.display = (id === 'pageProposeDay') ? 'block' : 'none';

        document.querySelector('.valentine-container').scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Attach click handlers to nav buttons
    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', () => nextPage(btn.getAttribute('data-target')));
    });

    // Yes Button
    document.getElementById('yesBtn')?.addEventListener('click', () => {
        nextPage('pageProposeDay');
        if (window.animateFireworks) window.animateFireworks();
    });

    // No Button Logic
    let noClicks = 0;
    const gifs = [
        "https://media.tenor.com/Mw5q8hX6NnIAAAAm/bubu-dudu-bubu.webp",
        "https://media.tenor.com/Mw5q8hX6NnIAAAAm/bubu-dudu-bubu.webp",
        "https://media.tenor.com/mX64AbW856EAAAAm/dudu-dudu-angry.webp",
        "https://media.tenor.com/dhuQV_msfiUAAAAM/cat-gun.gif",
        "https://media.tenor.com/0v8Y1C_f-p0AAAAi/love-mocha.gif"
    ];
    const texts = ["Will you be mine 🥺?", "Think again 😭", "Are You sure 😡?", "See This 🥱"];

    document.getElementById('noBtn')?.addEventListener('click', () => {
        noClicks++;
        const yesBtn = document.getElementById('yesBtn');
        const gif = document.getElementById('mainGif');
        const noBtn = document.getElementById('noBtn');
        const heading = document.querySelector('#page1 h1');

        if (noClicks < gifs.length) gif.src = gifs[noClicks];
        if (noClicks < texts.length) heading.textContent = texts[noClicks];

        const stages = [1.6, 2.8, 5, 45];
        if (noClicks <= 4) yesBtn.style.transform = `scale(${stages[noClicks - 1]})`;
        if (noClicks >= 4) { noBtn.style.opacity = "0"; noBtn.style.pointerEvents = "none"; }
    });

    // Final Transition - plays local video on click
    document.getElementById('finalBtn')?.addEventListener('click', () => {
        const burst = document.getElementById('burst');
        burst.style.display = 'block';
        burst.animate([{ width: '0', height: '0', opacity: 1 }, { width: '300vw', height: '300vw', opacity: 1 }], { duration: 1000, easing: 'ease-in-out', fill: 'forwards' });
        setTimeout(() => {
            nextPage('pageFinal');
            // Start playing video only when Final page is shown
            const video = document.getElementById('finalVideo');
            if (video) {
                video.currentTime = 0;
                video.play().catch(err => console.log('Video autoplay blocked:', err));
            }
            burst.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, fill: 'forwards' });
            setTimeout(() => burst.style.display = 'none', 1000);
        }, 900);
    });

    // Petals
    const createPetal = () => {
        if (currentActivePage === 'pageProposeDay') return;
        const bg = document.getElementById('bgAnim');
        if (!bg) return;
        const petal = document.createElement('div');
        petal.classList.add('petal');
        const startX = Math.random() * 100;
        const size = Math.random() * 15 + 10;
        const duration = Math.random() * 4 + 4;
        petal.style.left = startX + 'vw';
        petal.style.width = size + 'px';
        petal.style.height = size + 'px';
        petal.style.animationDuration = duration + 's';
        bg.appendChild(petal);
        setTimeout(() => petal.remove(), duration * 1000);
    };
    const petalInterval = setInterval(createPetal, 300); // We might need to clear this on route change

    // Quiz
    const questions = [
        { q: "Who is the absolute 'Boss' in this relationship 😌?", a: ["Obviously You", "Me", "My Mom"], correct: 0 },
        { q: "Who fights a lot in this relationship 😒?", a: ["Always You", "No One", "Me"], correct: 2 },
        { q: "Where do I plan to spend the rest of my life 🥺?", a: ["Paris", "In Your Heart", "On Mars"], correct: 1 }
    ];
    let currentQ = 0;

    function renderQuiz() {
        const box = document.getElementById('quiz-box');
        if (!box) return;
        if (currentQ >= questions.length) {
            box.innerHTML = "<h3>Yay! You passed the test! You really love me! 😭❤️</h3>";
            return;
        }
        const data = questions[currentQ];
        box.innerHTML = `<p class="quiz-question">${data.q}</p>${data.a.map((opt, i) => `<button class="quiz-option" data-idx="${i}">${opt}</button>`).join('')}`;

        box.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => checkAnswer(parseInt(e.target.dataset.idx)));
        });
    }

    function checkAnswer(index) {
        const feedback = document.getElementById('quiz-feedback');
        const buttons = document.querySelectorAll('.quiz-option');
        if (index === questions[currentQ].correct) {
            // Highlight correct answer green
            buttons[index].style.background = '#2ecc71';
            buttons[index].style.color = '#fff';
            feedback.innerText = "Correct! You're so smart! 😍";
            setTimeout(() => { currentQ++; feedback.innerText = ""; renderQuiz(); }, 1000);
        } else {
            // Highlight wrong answer red only
            buttons[index].style.background = '#e74c3c';
            buttons[index].style.color = '#fff';
            feedback.innerText = "Ooho , please try again. 😜";
            // Reset color after a moment
            setTimeout(() => {
                buttons[index].style.background = '';
                buttons[index].style.color = '';
            }, 800);
        }
    }
    renderQuiz();

    // Fireworks
    const canvas = document.getElementById('fireworksCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class Particle {
            constructor(x, y, color) {
                this.x = x; this.y = y; this.color = color;
                this.vel = { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 };
                this.alpha = 1;
            }
            draw() { ctx.globalAlpha = this.alpha; ctx.beginPath(); ctx.arc(this.x, this.y, 2, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
            update() { this.x += this.vel.x; this.y += this.vel.y; this.alpha -= 0.01; }
        }

        window.animateFireworks = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, i) => { if (p.alpha <= 0) particles.splice(i, 1); else { p.update(); p.draw(); } });
            if (Math.random() < 0.06) {
                const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                const x = Math.random() * canvas.width; const y = Math.random() * canvas.height * 0.4;
                for (let i = 0; i < 35; i++) particles.push(new Particle(x, y, color));
            }
            requestAnimationFrame(window.animateFireworks);
        }
    }
}

function render404(msg = "Page Not Found 💔") {
    // Clean up theme
    document.body.classList.remove('valentine-theme');
    app.innerHTML = `
    <div class="container error-page">
      <h1>404</h1>
      <p>${msg}</p>
      <br>
      <button class="btn" onclick="window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('popstate'));">Make Your Own 💖</button>
    </div>
  `;
}


// Initial Route
// We need to handle initial load carefully with Vite
// Vite by default serves index.html for root.
// If we go to localhost:5173/v1/foo directly, Vite might 404 if not rewriting.
// BUT, the user wants "Frontend must not be rebuilt for new pages" -> routing handled by JS.
// In dev (npm run dev), we might need to rely on the fallback usually provided by vite dev server.
handleRoute();

// A hack for global onclick in render404
window.renderCreatePage = renderCreatePage; // Expose if needed or just use event dispatch
