document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');

    if (menuBtn && mobileNav) {
        menuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
            
            // Toggle icon between list and x (close)
            const icon = menuBtn.querySelector('i');
            if (mobileNav.classList.contains('active')) {
                icon.classList.remove('ph-list');
                icon.classList.add('ph-x');
            } else {
                icon.classList.remove('ph-x');
                icon.classList.add('ph-list');
            }
        });
    }

    // Optional: Visual interaction for Quick Menu (Hover effect is in CSS, JS can add active state click)
    const quickItems = document.querySelectorAll('.quick-item');
    quickItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            quickItems.forEach(i => i.classList.remove('active'));
            // Add active to clicked
            item.classList.add('active');
        });
    });
});
