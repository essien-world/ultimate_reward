// Add this to your script.js file
history.pushState(null, null, location.href);

window.addEventListener('popstate', function (event) {
    window.location.href = 'https://www.example.com'; // Replace with your target URL
});


or for http


<script>
    history.pushState(null, null, location.href);

    window.addEventListener('popstate', function (event) {
        window.location.href = 'https://www.example.com'; // Replace with your target URL
    });
</script>