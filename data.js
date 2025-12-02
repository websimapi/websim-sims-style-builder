export const TEXTURES = {
  walls: [
    { id: 'drywall_white', name: 'White Drywall', prompt: 'white painted drywall texture, seamless' },
    { id: 'brick_red', name: 'Red Brick', prompt: 'red brick wall exterior texture, seamless' },
    { id: 'wood_oak', name: 'Oak Paneling', prompt: 'oak wood paneling wall texture, seamless' },
    { id: 'wallpaper_floral', name: 'Floral Wallpaper', prompt: 'vintage floral wallpaper pattern, seamless' },
  ],
  floors: [
    { id: 'floor_oak', name: 'Light Oak', prompt: 'light oak hardwood floor planks texture, seamless' },
    { id: 'floor_tile_white', name: 'White Tile', prompt: 'white ceramic floor tiles texture, seamless' },
    { id: 'floor_marble', name: 'Marble', prompt: 'white marble floor texture, seamless' },
    { id: 'carpet_beige', name: 'Beige Carpet', prompt: 'beige carpet fabric texture, seamless' },
  ],
  terrain: [
    { id: 'grass', name: 'Grass', prompt: 'green grass lawn texture, seamless' },
    { id: 'dirt', name: 'Dirt', prompt: 'brown dirt ground texture, seamless' },
    { id: 'sand', name: 'Sand', prompt: 'beach sand texture, seamless' },
    { id: 'stone', name: 'Stone', prompt: 'grey stone paving texture, seamless' },
  ]
};

export const OBJECT_CATALOG = {
  seating: [
    { id: 'chair_simple', name: 'Dining Chair', dims: [0.5, 1, 0.5], type: 'chair' },
    { id: 'sofa_3', name: 'Sofa', dims: [2.0, 0.8, 0.9], type: 'sofa' },
    { id: 'armchair', name: 'Armchair', dims: [0.9, 0.8, 0.9], type: 'armchair' },
  ],
  tables: [
    { id: 'table_dining', name: 'Dining Table', dims: [1.5, 0.8, 1.0], type: 'table' },
    { id: 'table_coffee', name: 'Coffee Table', dims: [1.2, 0.4, 0.6], type: 'coffee_table' },
  ],
  bedroom: [
    { id: 'bed_double', name: 'Double Bed', dims: [1.6, 0.6, 2.0], type: 'bed' },
    { id: 'nightstand', name: 'Nightstand', dims: [0.5, 0.6, 0.5], type: 'cabinet' },
  ],
  decor: [
    { id: 'plant', name: 'Potted Plant', dims: [0.4, 1.0, 0.4], type: 'plant' },
    { id: 'lamp', name: 'Floor Lamp', dims: [0.3, 1.5, 0.3], type: 'lamp' },
  ]
};