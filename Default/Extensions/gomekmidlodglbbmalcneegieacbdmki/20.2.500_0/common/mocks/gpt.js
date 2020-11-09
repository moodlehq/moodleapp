(function() {
  var a = function() {return {};},
    f = this,
    g = {},
    h = {};
  g.defineSlot = g.defineOutOfPageSlot = g.defineUnit =
    h.addService = h.setTargeting =
      function() {
        return h;
      };
  g.cmd = {};
  g.companionAds = g.eventLog = g.display = g.enableServices =
    g.cmd.push = a;
  g.pubads = function() {return { refresh : a, collapseEmptyDivs : a };};


  f.googletag = g;
})();