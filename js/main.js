// Sticky nav on scroll
const nav = document.getElementById('nav');
if (nav) {
    window.addEventListener('scroll', () => {
        if (!nav.classList.contains('nav--portal')) {
            nav.classList.toggle('scrolled', window.scrollY > 60);
        }
    }, { passive: true });
}

// Mobile menu toggle
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('open');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

// Scroll-triggered fade-up animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('[data-animate]').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 0.12}s`;
    observer.observe(el);
});

// Contact form feedback
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        btn.textContent = 'Message Sent!';
        btn.style.cssText = 'background:#22c55e; border-color:#22c55e; cursor:default;';
        setTimeout(() => {
            btn.textContent = 'Send Message';
            btn.style.cssText = '';
            contactForm.reset();
        }, 3500);
    });
}

const crewLoginForm = document.getElementById('crewLoginForm');
const crewDashboard = document.getElementById('crewDashboard');

if (crewLoginForm && crewDashboard) {
    crewLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        crewDashboard.classList.add('is-visible');
        crewDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

const copyBriefBtn = document.getElementById('copyBriefBtn');
if (copyBriefBtn) {
    copyBriefBtn.addEventListener('click', async () => {
        const brief = [
            'Dunlap Summer Kickoff',
            'Crew call: Saturday, June 13 at 2:00 PM',
            'Venue: North Park Bandshell',
            'Role: Stage Audio',
            'Note: Rain plan is active.'
        ].join('\n');

        try {
            await navigator.clipboard.writeText(brief);
            copyBriefBtn.textContent = 'Copied';
        } catch {
            copyBriefBtn.textContent = 'Copy unavailable';
        }
        setTimeout(() => { copyBriefBtn.textContent = 'Copy Brief'; }, 1800);
    });
}

const calendarBtn = document.getElementById('calendarBtn');
if (calendarBtn) {
    calendarBtn.addEventListener('click', () => {
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Rock Solid Productions//Crew Portal//EN',
            'BEGIN:VEVENT',
            'UID:rsp-dunlap-summer-kickoff-20260613',
            'DTSTAMP:20260602T170000Z',
            'DTSTART:20260613T190000Z',
            'DTEND:20260614T030000Z',
            'SUMMARY:RSP Crew Call: Dunlap Summer Kickoff',
            'LOCATION:North Park Bandshell',
            'DESCRIPTION:Crew call at 2:00 PM. Stage audio assignment. Rain plan active.',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rsp-dunlap-summer-kickoff.ics';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    });
}
