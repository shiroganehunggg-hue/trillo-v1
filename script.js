const instrumentCards = document.querySelectorAll('a.card');

instrumentCards.forEach((card) => {
    card.addEventListener('click', function () {
        instrumentCards.forEach((item) => item.classList.remove('active'));
        card.classList.add('active');
    });
});