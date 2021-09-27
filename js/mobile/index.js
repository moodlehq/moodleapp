this.CoreSitesProvider.getSite().then(site => {
    const username = site.infos.username;

    document.getElementById('username').innerText = `, ${username}`;
});
