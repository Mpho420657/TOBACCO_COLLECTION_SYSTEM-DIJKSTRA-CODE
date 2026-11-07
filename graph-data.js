/*
 * Graph data for the tobacco collection network (central and southern Malawi).
 * Nodes are the main trading centres of 22 districts.
 * Edges are roads between neighbouring districts, with distances in km (Google Maps).
 * The graph is undirected.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TobaccoGraphData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const districts = [
    { code: 'KA', name: 'Kasungu',    region: 'Central',  floor: 'Chinkhoma' },
    { code: 'LL', name: 'Lilongwe',   region: 'Central',  floor: 'Kanengo' },
    { code: 'DW', name: 'Dowa',       region: 'Central' },
    { code: 'DZ', name: 'Dedza',      region: 'Central' },
    { code: 'MC', name: 'Mchinji',    region: 'Central' },
    { code: 'NK', name: 'Nkhotakota', region: 'Central' },
    { code: 'NS', name: 'Ntchisi',    region: 'Central' },
    { code: 'NT', name: 'Ntcheu',     region: 'Central' },
    { code: 'SA', name: 'Salima',     region: 'Central' },
    { code: 'BT', name: 'Blantyre',   region: 'Southern', floor: 'Limbe' },
    { code: 'MA', name: 'Machinga',   region: 'Southern' },
    { code: 'MG', name: 'Mangochi',   region: 'Southern' },
    { code: 'NJ', name: 'Nsanje',     region: 'Southern' },
    { code: 'PH', name: 'Phalombe',   region: 'Southern' },
    { code: 'ZA', name: 'Zomba',      region: 'Southern' },
    { code: 'BA', name: 'Balaka',     region: 'Southern' },
    { code: 'CK', name: 'Chikwawa',   region: 'Southern' },
    { code: 'CR', name: 'Chiradzulu', region: 'Southern' },
    { code: 'ML', name: 'Mulanje',    region: 'Southern' },
    { code: 'MW', name: 'Mwanza',     region: 'Southern' },
    { code: 'NE', name: 'Neno',       region: 'Southern' },
    { code: 'TH', name: 'Thyolo',     region: 'Southern' }
  ];

  // [from, to, distance in km]
  const edges = [
    ['KA', 'LL', 131],  ['LL', 'MC', 108],  ['LL', 'DW', 52.3], ['DW', 'NS', 41.7],
    ['NS', 'KA', 78.5], ['LL', 'SA', 101],  ['SA', 'NK', 112],  ['NK', 'KA', 112],
    ['LL', 'DZ', 89],   ['DZ', 'NT', 73.2], ['SA', 'MG', 173],  ['NT', 'BA', 42.5],
    ['BA', 'MA', 49.9], ['MA', 'MG', 91.6], ['MA', 'ZA', 34.4], ['BA', 'NE', 123],
    ['NE', 'BT', 108],  ['NE', 'MW', 40],   ['BT', 'MW', 104],  ['BT', 'CR', 26.3],
    ['CR', 'ZA', 43],   ['BT', 'TH', 42.5], ['TH', 'ML', 44.1], ['ML', 'PH', 43.1],
    ['PH', 'ZA', 76.1], ['BT', 'CK', 26.3], ['CK', 'NJ', 125]
  ];

  // The three auction floors (destinations)
  const floors = ['KA', 'LL', 'BT'];

  return { districts, edges, floors };
});
