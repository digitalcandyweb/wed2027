    // Burger menu logic
    const burgerBtn = document.getElementById('burgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const menuLinks = document.querySelectorAll('.menu-link');

    function openMenu() {
      sideMenu.classList.add('open');
      overlay.classList.add('visible');
      document.body.classList.add('no-scroll');
    }
    function closeMenu() {
      sideMenu.classList.remove('open');
      overlay.classList.remove('visible');
      document.body.classList.remove('no-scroll');
    }

    burgerBtn.addEventListener('click', openMenu);
    closeMenuBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
    menuLinks.forEach(link => link.addEventListener('click', closeMenu));

    // Carousel logic (single carousel for now)
    document.querySelectorAll('[data-carousel]').forEach(carousel => {
      const images = carousel.querySelectorAll('.carousel-image');
      const dots = carousel.querySelectorAll('.dot');
      const prevBtn = carousel.querySelector('.prev');
      const nextBtn = carousel.querySelector('.next');
      let index = 0;

      function showSlide(i) {
        images.forEach((img, idx) => img.classList.toggle('active', idx === i));
        dots.forEach((dot, idx) => dot.classList.toggle('active', idx === i));
        index = i;
      }

      prevBtn?.addEventListener('click', () => showSlide((index - 1 + images.length) % images.length));
      nextBtn?.addEventListener('click', () => showSlide((index + 1) % images.length));
      dots.forEach((dot, idx) => dot.addEventListener('click', () => showSlide(idx)));
    });