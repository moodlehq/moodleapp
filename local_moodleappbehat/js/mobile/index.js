this.CoreSitesProvider.getSite().then(site => {
    const username = site.infos.username;

    document.getElementById('username').innerText = `, ${username}`;
});

this.ngAfterViewInit = () => this.CoreDomUtilsProvider.showToast('Lifecycle hook called');
