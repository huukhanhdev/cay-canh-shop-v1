// Product gallery carousel
(function() {
  // Get images from data attribute
  const galleryMain = document.querySelector('.gallery-main');
  if (!galleryMain) {
    console.log('No gallery found');
    return;
  }

  const imagesData = galleryMain.getAttribute('data-images');
  if (!imagesData) {
    console.log('No images data');
    return;
  }

  let images;
  try {
    images = JSON.parse(imagesData);
  } catch (e) {
    console.error('Failed to parse images:', e);
    return;
  }

  console.log('Gallery images:', images);
  
  if (!images || images.length <= 1) {
    console.log('Not enough images for carousel');
    return;
  }

  let currentIndex = 0;
  const mainImg = document.getElementById('mainImage');
  const prevBtn = document.querySelector('.gallery-nav.prev');
  const nextBtn = document.querySelector('.gallery-nav.next');
  const thumbs = document.querySelectorAll('.gallery-thumbs .thumb');
  
  console.log('Found thumbs:', thumbs.length, 'mainImg:', !!mainImg);

  if (!mainImg || !thumbs.length) {
    console.warn('Gallery elements not found');
    return;
  }

  function updateGallery() {
    console.log('Update to index:', currentIndex);
    mainImg.src = images[currentIndex];
    thumbs.forEach((t, i) => {
      if (i === currentIndex) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });
    if (prevBtn) {
      if (currentIndex > 0) {
        prevBtn.classList.add('show');
      } else {
        prevBtn.classList.remove('show');
      }
    }
    if (nextBtn) {
      if (currentIndex < images.length - 1) {
        nextBtn.classList.add('show');
      } else {
        nextBtn.classList.remove('show');
      }
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if (currentIndex > 0) {
        currentIndex--;
        updateGallery();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (currentIndex < images.length - 1) {
        currentIndex++;
        updateGallery();
      }
    });
  }

  thumbs.forEach(function(thumb, idx) {
    console.log('Attaching click to thumb', idx);
    thumb.addEventListener('click', function() {
      console.log('Thumb clicked:', idx);
      currentIndex = idx;
      updateGallery();
    });
  });

  updateGallery();
  console.log('Gallery initialized');
})();
