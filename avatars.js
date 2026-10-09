export const avatars = [
  {id:'fox', icon:'🦊', label:'Fox'}, {id:'lion', icon:'🦁', label:'Lion'},
  {id:'panda', icon:'🐼', label:'Panda'}, {id:'wolf', icon:'🐺', label:'Wolf'},
  {id:'cat', icon:'🐱', label:'Cat'}, {id:'owl', icon:'🦉', label:'Owl'},
  {id:'shark', icon:'🦈', label:'Shark'}, {id:'dragon', icon:'🐉', label:'Dragon'},
  {id:'penguin', icon:'🐧', label:'Penguin'}, {id:'robot', icon:'🤖', label:'Robot'},
  {id:'alien', icon:'👽', label:'Alien'}, {id:'astronaut', icon:'🧑‍🚀', label:'Astronaut'}
];
export function avatarFor(id) { return avatars.find(a => a.id === id) || avatars[0]; }
export function validAvatar(id) { return avatars.some(a => a.id === id); }
