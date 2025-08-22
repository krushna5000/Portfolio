$(document).ready(function () {
    // Modern navbar functionality
    $('#menu').click(function () {
        $(this).toggleClass('fa-times');
        $('.navbar').toggleClass('nav-toggle');
        $('body').toggleClass('menu-open');
    });

    // Enhanced scroll functionality with header effects
    $(window).on('scroll load', function () {
        $('#menu').removeClass('fa-times');
        $('.navbar').removeClass('nav-toggle');
        $('body').removeClass('menu-open');

        // Add scrolled class to header for glassmorphism effect
        if (window.scrollY > 60) {
            $('header').addClass('scrolled');
            document.querySelector('#scroll-top').classList.add('active');
        } else {
            $('header').removeClass('scrolled');
            document.querySelector('#scroll-top').classList.remove('active');
        }

        // Enhanced scroll spy with smooth transitions
        $('section').each(function () {
            let height = $(this).height();
            let offset = $(this).offset().top - 200;
            let top = $(window).scrollTop();
            let id = $(this).attr('id');

            if (top > offset && top < offset + height) {
                $('.navbar ul li a').removeClass('active');
                $('.navbar').find(`[href="#${id}"]`).addClass('active');
            }
        });
    });

    // Enhanced smooth scrolling with easing
    $('a[href*="#"]').on('click', function (e) {
        e.preventDefault();
        const target = $($(this).attr('href'));
        if (target.length) {
            $('html, body').animate({
                scrollTop: target.offset().top - 70,
            }, 800, 'easeInOutCubic');
        }
    });

    // Modern contact form handling
    const contactForm = document.querySelector('form[action*="web3forms"]');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            const button = this.querySelector('button[type="submit"]');
            const originalText = button.innerHTML;

            // Show loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            button.disabled = true;

            // Reset after form submission (Web3Forms handles the actual submission)
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        });
    }

    // Initialize modern animations and effects
    initializeModernEffects();
});

// Modern page visibility handling
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === "visible") {
        document.title = "Portfolio | Krushna Kakde";
        $("#favicon").attr("href", "assets/images/favicon.png");
    } else {
        document.title = "Come Back! | Krushna Kakde";
        $("#favicon").attr("href", "assets/images/favhand.png");
    }
});

// Modern effects initialization
function initializeModernEffects() {
    // Initialize ScrollReveal animations
    if (typeof ScrollReveal !== 'undefined') {
        const sr = ScrollReveal({
            origin: 'bottom',
            distance: '60px',
            duration: 1000,
            delay: 200,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            reset: false
        });

        // Animate different sections with different effects
        sr.reveal('.heading', {
            origin: 'top',
            distance: '80px',
            duration: 1200
        });

        sr.reveal('.home .content h2', {
            origin: 'left',
            distance: '100px',
            duration: 1000
        });

        sr.reveal('.home .content p', {
            origin: 'left',
            distance: '100px',
            delay: 400
        });

        sr.reveal('.home .btn', {
            origin: 'bottom',
            delay: 600
        });

        sr.reveal('.home .socials', {
            origin: 'bottom',
            delay: 800
        });

        sr.reveal('.home .image', {
            origin: 'right',
            distance: '100px',
            delay: 400
        });

        sr.reveal('.about .row .image', {
            origin: 'left',
            distance: '100px'
        });

        sr.reveal('.about .row .content', {
            origin: 'right',
            distance: '100px',
            delay: 300
        });

        sr.reveal('.skills .container .bar', {
            interval: 100,
            scale: 0.8
        });

        sr.reveal('.education .box-container .box', {
            interval: 200,
            scale: 0.9
        });

        sr.reveal('.certificate', {
            interval: 150,
            scale: 0.9
        });

        sr.reveal('.project-card', {
            interval: 200,
            scale: 0.8
        });

        sr.reveal('.contact .container', {
            scale: 0.9,
            duration: 1200
        });
    }

    // Initialize project filtering
    initializeProjectFilters();

    // Initialize particle effects for hero section
    initializeParticles();

    // Initialize typing animation enhancements
    enhanceTypingAnimation();
}


// Enhanced typing animation
var typed = new Typed(".typing-text", {
    strings: [
        "Full Stack Development",
        "Frontend Development",
        "Backend Development",
        "Mobile App Development",
        "UI/UX Design",
        "Database Management"
    ],
    loop: true,
    typeSpeed: 60,
    backSpeed: 30,
    backDelay: 1000,
    startDelay: 500,
    fadeOut: true,
    fadeOutClass: 'typed-fade-out',
    fadeOutDelay: 500
});

// Project filtering functionality
function initializeProjectFilters() {
    // Add filter buttons to projects section if they don't exist
    const projectsSection = document.querySelector('.github-projects');
    if (projectsSection && !document.querySelector('.project-filters')) {
        const filtersHTML = `
            <div class="project-filters">
                <button class="filter-btn active" data-filter="all">All Projects</button>
                <button class="filter-btn" data-filter="web">Web Apps</button>
                <button class="filter-btn" data-filter="mobile">Mobile Apps</button>
                <button class="filter-btn" data-filter="backend">Backend</button>
                <button class="filter-btn" data-filter="ml">Machine Learning</button>
            </div>
        `;

        const heading = projectsSection.querySelector('.heading');
        if (heading) {
            heading.insertAdjacentHTML('afterend', filtersHTML);
        }
    }

    // Add filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            projectCards.forEach(card => {
                if (filterValue === 'all') {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeInUp 0.6s ease forwards';
                } else {
                    // Simple filtering based on project names (you can enhance this)
                    const projectName = card.querySelector('h3').textContent.toLowerCase();
                    const shouldShow = checkProjectCategory(projectName, filterValue);

                    if (shouldShow) {
                        card.style.display = 'flex';
                        card.style.animation = 'fadeInUp 0.6s ease forwards';
                    } else {
                        card.style.animation = 'fadeOutDown 0.4s ease forwards';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 400);
                    }
                }
            });
        });
    });
}

function checkProjectCategory(projectName, category) {
    const categories = {
        web: ['portfolio', 'web-server', 'ticket_booking', 'login-form'],
        mobile: ['tinyneedsapp', 'parentalcontrol'],
        backend: ['spring', 'jdbc_connectivity', 'web-server'],
        ml: ['movie-recommandation-ml-project']
    };

    return categories[category]?.some(keyword => projectName.includes(keyword)) || false;
}

async function fetchData(type = "skills") {
    let response
    type === "skills" ?
        response = await fetch("skills.json")
        :
        response = await fetch("./projects/projects.json")
    const data = await response.json();
    return data;
}

function showSkills(skills) {
    let skillsContainer = document.getElementById("skillsContainer");
    let skillHTML = "";

    skills.forEach((skill, index) => {
        skillHTML += `
        <div class="bar" style="animation-delay: ${index * 0.1}s">
              <div class="info">
                <img src="${skill.icon}" alt="${skill.name}" loading="lazy" />
                <span>${skill.name}</span>
              </div>
            </div>`;
    });

    skillsContainer.innerHTML = skillHTML;

    // Add intersection observer for skill animations
    const skillBars = document.querySelectorAll('.skills .bar');
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'slideInUp 0.6s ease forwards';
                entry.target.style.opacity = '1';
            }
        });
    }, { threshold: 0.1 });

    skillBars.forEach(bar => {
        bar.style.opacity = '0';
        skillObserver.observe(bar);
    });
}

function showProjects(projects) {
    let projectsContainer = document.querySelector("#work .box-container");
    let projectHTML = "";
    projects.slice(0, 10).filter(project => project.category != "android").forEach(project => {
        projectHTML += `
        <div class="box tilt">
      <img draggable="false" src="/assets/images/projects/${project.image}.png" alt="project" />
      <div class="content">
        <div class="tag">
        <h3>${project.name}</h3>
        </div>
        <div class="desc">
          <p>${project.desc}</p>
          <div class="btns">
            <a href="${project.links.view}" class="btn" target="_blank"><i class="fas fa-eye"></i> View</a>
            <a href="${project.links.code}" class="btn" target="_blank">Code <i class="fas fa-code"></i></a>
          </div>
        </div>
      </div>
    </div>`
    });
    projectsContainer.innerHTML = projectHTML;

    // <!-- tilt js effect starts -->
    VanillaTilt.init(document.querySelectorAll(".tilt"), {
        max: 15,
    });
    // <!-- tilt js effect ends -->

    /* ===== SCROLL REVEAL ANIMATION ===== */
    const srtop = ScrollReveal({
        origin: 'top',
        distance: '80px',
        duration: 1000,
        reset: true
    });

    /* SCROLL PROJECTS */
    srtop.reveal('.work .box', { interval: 200 });

}

fetchData().then(data => {
    showSkills(data);
});

fetchData("projects").then(data => {
    showProjects(data);
});

// <!-- tilt js effect starts -->
VanillaTilt.init(document.querySelectorAll(".tilt"), {
    max: 15,
});
// <!-- tilt js effect ends -->


// pre loader start
// function loader() {
//     document.querySelector('.loader-container').classList.add('fade-out');
// }
// function fadeOut() {
//     setInterval(loader, 500);
// }
// window.onload = fadeOut;
// pre loader end

// disable developer mode
document.onkeydown = function (e) {
    if (e.keyCode == 123) {
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) {
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
        return false;
    }
    if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
        return false;
    }
}

// Start of Tawk.to Live Chat
var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
(function () {
    var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/60df10bf7f4b000ac03ab6a8/1f9jlirg6';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
})();
// End of Tawk.to Live Chat


/* ===== SCROLL REVEAL ANIMATION ===== */
const srtop = ScrollReveal({
    origin: 'top',
    distance: '80px',
    duration: 1000,
    reset: true
});

/* SCROLL HOME */
srtop.reveal('.home .content h3', { delay: 200 });
srtop.reveal('.home .content p', { delay: 200 });
srtop.reveal('.home .content .btn', { delay: 200 });

srtop.reveal('.home .image', { delay: 400 });
srtop.reveal('.home .linkedin', { interval: 600 });
srtop.reveal('.home .github', { interval: 800 });
srtop.reveal('.home .twitter', { interval: 1000 });
srtop.reveal('.home .telegram', { interval: 600 });
srtop.reveal('.home .instagram', { interval: 600 });
srtop.reveal('.home .dev', { interval: 600 });

/* ENHANCED SCROLL ANIMATIONS */
srtop.reveal('.about .content h3', { delay: 200 });
srtop.reveal('.about .content .tag', { delay: 200 });
srtop.reveal('.about .content p', { delay: 200 });
srtop.reveal('.about .content .box-container', { delay: 200 });
srtop.reveal('.about .content .resumebtn', { delay: 200 });

// Initialize particle effects
function initializeParticles() {
    const particlesContainer = document.getElementById('particles-js');
    if (particlesContainer) {
        // Create floating particles
        for (let i = 0; i < 50; i++) {
            createParticle(particlesContainer);
        }
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 2}px;
        height: ${Math.random() * 4 + 2}px;
        background: rgba(99, 102, 241, ${Math.random() * 0.5 + 0.2});
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: float ${Math.random() * 10 + 10}s infinite linear;
        pointer-events: none;
    `;
    container.appendChild(particle);
}

// Enhanced typing animation
function enhanceTypingAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        .typed-cursor {
            animation: blink 1s infinite;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(120deg); }
            66% { transform: translateY(5px) rotate(240deg); }
        }
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes fadeOutDown {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(30px);
            }
        }
        .particle {
            z-index: 0;
        }
    `;
    document.head.appendChild(style);
}

// Load skills data with enhanced error handling
fetchData().then(data => {
    showSkills(data);
}).catch(error => {
    console.error('Error loading skills:', error);
});


/* SCROLL SKILLS */
srtop.reveal('.skills .container', { interval: 200 });
srtop.reveal('.skills .container .bar', { delay: 400 });

/* SCROLL EDUCATION */
srtop.reveal('.education .box', { interval: 200 });

/* SCROLL PROJECTS */
srtop.reveal('.work .box', { interval: 200 });

/* SCROLL EXPERIENCE */
srtop.reveal('.experience .timeline', { delay: 400 });
srtop.reveal('.experience .timeline .container', { interval: 400 });

/* SCROLL CONTACT */
srtop.reveal('.contact .container', { delay: 400 });
srtop.reveal('.contact .container .form-group', { delay: 400 });