$(document).ready(function () {
    // Mobile nav toggle
    $('#menu').click(function () {
        $(this).toggleClass('fa-times');
        $('.navbar').toggleClass('nav-toggle');
        $('body').toggleClass('menu-open');
    });

    // Header scroll state + scroll-spy
    $(window).on('scroll load', function () {
        $('#menu').removeClass('fa-times');
        $('.navbar').removeClass('nav-toggle');
        $('body').removeClass('menu-open');

        if (window.scrollY > 60) {
            $('header').addClass('scrolled');
            document.querySelector('#scroll-top').classList.add('active');
        } else {
            $('header').removeClass('scrolled');
            document.querySelector('#scroll-top').classList.remove('active');
        }

        $('section').each(function () {
            const height = $(this).height();
            const offset = $(this).offset().top - 150;
            const top = $(window).scrollTop();
            const id = $(this).attr('id');

            if (top >= offset && top < offset + height) {
                $('.navbar ul li a').removeClass('active');
                $('.navbar').find(`[href="#${id}"]`).addClass('active');
            }
        });
    });

    // Smooth in-page scrolling
    $('a[href*="#"]').on('click', function (e) {
        const href = $(this).attr('href');
        if (!href || !href.startsWith('#') || href === '#') return;

        e.preventDefault();
        const target = $(href);
        if (!target.length) return;

        $('#menu').removeClass('fa-times');
        $('.navbar').removeClass('nav-toggle');
        $('body').removeClass('menu-open');

        $('.navbar ul li a').removeClass('active');
        $(this).addClass('active');

        $('html, body').animate({ scrollTop: target.offset().top - 80 }, 700, 'swing', function () {
            if (history.pushState) history.pushState(null, null, href);
        });
    });

    // Contact form loading state (Web3Forms handles the actual submit)
    const contactForm = document.querySelector('form[action*="web3forms"]');
    if (contactForm) {
        contactForm.addEventListener('submit', function () {
            const button = this.querySelector('button[type="submit"]');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            button.disabled = true;
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        });
    }

    initTypingAnimation();
    initProjectFilters();
    initReveal();
    initStatCounters();

    if (window.location.hash) {
        const target = $(window.location.hash);
        if (target.length) {
            setTimeout(() => {
                $('html, body').animate({ scrollTop: target.offset().top - 80 }, 700, 'swing');
            }, 100);
        }
    }
});

document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
        document.title = 'Portfolio | Krushna Kakde';
    }
});

/* ---------- Typing animation ---------- */
function initTypingAnimation() {
    if (typeof Typed === 'undefined') return;
    new Typed('.typing-text', {
        strings: [
            'Full Stack Development',
            'Frontend Engineering',
            'Backend Engineering',
            'Mobile App Development',
            'API Design',
            'Database Management'
        ],
        loop: true,
        typeSpeed: 55,
        backSpeed: 28,
        backDelay: 1400,
        startDelay: 400,
        fadeOut: true,
        fadeOutClass: 'typed-fade-out',
        fadeOutDelay: 400
    });
}

/* ---------- Scroll reveal (IntersectionObserver based) ---------- */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

function observeReveal(el, index = 0, extraClass = '') {
    el.classList.add('reveal');
    if (extraClass) el.classList.add(extraClass);
    el.style.setProperty('--d', `${Math.min(index, 8) * 0.08}s`);
    revealObserver.observe(el);
}

function initReveal() {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    document.querySelectorAll('.heading').forEach((el) => observeReveal(el));

    const heroLeft = document.querySelectorAll('.home .open-to-work-badge, .home .content h2, .home .content p, .home .hero-cta, .home .hero-stats, .home .socials');
    heroLeft.forEach((el, i) => observeReveal(el, i, 'reveal-left'));
    const heroImage = document.querySelector('.home .image');
    if (heroImage) observeReveal(heroImage, 2, 'reveal-right');

    const aboutImage = document.querySelector('.about .row .image');
    if (aboutImage) observeReveal(aboutImage, 0, 'reveal-left');
    const aboutContent = document.querySelectorAll('.about .row .content > *');
    aboutContent.forEach((el, i) => observeReveal(el, i, 'reveal-right'));

    document.querySelectorAll('.exp-item').forEach((el, i) => observeReveal(el, i));
    document.querySelectorAll('.education .box').forEach((el, i) => observeReveal(el, i, 'reveal-scale'));
    document.querySelectorAll('.project-card').forEach((el, i) => observeReveal(el, i, 'reveal-scale'));
    document.querySelectorAll('.certificate').forEach((el, i) => observeReveal(el, i, 'reveal-scale'));
    document.querySelectorAll('.soft-item').forEach((el, i) => observeReveal(el, i, 'reveal-scale'));

    const contactContainer = document.querySelector('.contact .container');
    if (contactContainer) observeReveal(contactContainer, 0, 'reveal-scale');
}

/* ---------- Animated stat counters ---------- */
function initStatCounters() {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = document.querySelectorAll('.hero-stat-num, .about-stat-num');
    if (reduceMotion || !nodes.length) return;

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            animateCount(entry.target);
            counterObserver.unobserve(entry.target);
        });
    }, { threshold: 0.6 });

    nodes.forEach((el) => counterObserver.observe(el));
}

function animateCount(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!match) return;

    const target = parseFloat(match[1]);
    const suffix = match[2] || '';
    const decimals = match[1].includes('.') ? match[1].split('.')[1].length : 0;
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = value.toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
}

/* ---------- Project filtering + search ---------- */
function initProjectFilters() {
    const projectsSection = document.querySelector('.github-projects');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    const searchInput = document.getElementById('project-search');
    const countEl = document.getElementById('project-count');

    if (!projectsSection || !projectCards.length) return;

    function matchesFilter(card, filterValue) {
        if (!filterValue || filterValue === 'all') return true;
        return card.getAttribute('data-category') === filterValue;
    }

    function matchesQuery(card, query) {
        if (!query) return true;
        const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('p')?.textContent || '').toLowerCase();
        const techs = Array.from(card.querySelectorAll('.project-tech .tech-tag')).map((t) => t.textContent.toLowerCase()).join(' ');
        return `${name} ${desc} ${techs}`.includes(query);
    }

    function applyFilters() {
        const activeBtn = document.querySelector('.filter-btn.active');
        const filterValue = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
        const query = (searchInput?.value || '').trim().toLowerCase();
        let visible = 0;

        projectCards.forEach((card) => {
            const show = matchesFilter(card, filterValue) && matchesQuery(card, query);
            card.style.display = show ? 'flex' : 'none';
            if (show) visible++;
        });

        if (countEl) {
            countEl.textContent = (query || filterValue !== 'all')
                ? `Showing ${visible} project${visible === 1 ? '' : 's'}`
                : 'Showing all';
        }
    }

    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 150));
    }

    applyFilters();
}

function debounce(fn, wait) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

/* ---------- Skills grid ---------- */
async function fetchSkills() {
    const response = await fetch('skills.json');
    return response.json();
}

function showSkills(skills) {
    const container = document.getElementById('skillsContainer');
    if (!container) return;

    container.innerHTML = skills.map((skill) => `
        <div class="skill-card">
            <div class="skill-icon"><img src="${skill.icon}" alt="${skill.name}" loading="lazy" /></div>
            <span>${skill.name}</span>
        </div>
    `).join('');

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    document.querySelectorAll('#skillsContainer .skill-card').forEach((el, i) => observeReveal(el, i % 8, 'reveal-scale'));
}

fetchSkills()
    .then(showSkills)
    .catch((error) => console.error('Error loading skills:', error));

/* ---------- Live chat widget ---------- */
var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
(function () {
    var s1 = document.createElement('script'), s0 = document.getElementsByTagName('script')[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/60df10bf7f4b000ac03ab6a8/1f9jlirg6';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
})();
