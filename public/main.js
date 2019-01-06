window.onload = function() {

  // Highlight the current page in the nav bar
  displayActiveNavItem();

  function displayActiveNavItem() {
  var path = window.location.pathname;
  path = path.substring(1);
  var navitem = document.getElementById(path);
  console.log(navitem);
  if (navitem) {
    navitem.parentElement.classList.add("active");
  }
  else if (!path) {
    var navitem = document.getElementById("home");
    navitem.parentElement.classList.add("active");
  }
  }

  // Change nav bar on scroll
  var scrollPos = 0;
  var navbar = document.getElementById("navbar");
  window.addEventListener("scroll", function() {
    scrollPos = window.pageYOffset;
    if (scrollPos > 100) {
      navbar.classList.add("scrolled", "navbar-dark");
    }
    else if (scrollPos < 50) {
      navbar.classList.remove("scrolled", "navbar-dark");
    }
  });

  // Change nav bar on expand (mobile devices)

  $(".navbar-toggler").click(function() {
    if (!$(this).next().hasClass("show") && scrollPos < 101) {
      navbar.classList.add("scrolled", "navbar-dark");
    }
    else if (scrollPos < 101) {
      navbar.classList.remove("scrolled", "navbar-dark");
    }
  });


}
