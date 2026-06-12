const site = this.CoreSitesProvider.getCurrentSite();

document.getElementById('username').innerText = `, ${site.infos.username}`;

this.ngAfterViewInit = () => this.CoreToastsService.show({message: 'Lifecycle hook called'});
