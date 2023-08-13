export const relationTypes = ['Blocked by', 'Blocks', 'Relates to', 'Duplicate of', 'Duplicated by'];

export const oppositeRelationTypesMap = {
  'Blocked by': 'Blocks',
  Blocks: 'Blocked by',
  'Relates to': 'Relates to',
  'Duplicated by': 'Duplicate of',
  'Duplicate of': 'Duplicated by',
};
