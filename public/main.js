window.onload = function() {

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
}
