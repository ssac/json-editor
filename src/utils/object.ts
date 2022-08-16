import * as _ from 'lodash';

/**
 * Check is mainObj contains all properties of subObj.
 * @param subObj A comparator object.
 * @param mainObj A object be compared to.
 * @returns If subObj part of mainObj, return true, otherwise false.
 */
export const checkIfPartial = (subObj: object, mainObj: object): boolean => {
  const keys = _.keys(subObj);

  for (const key of keys) {
    if (subObj[key] !== mainObj[key]) {
      return false;
    }
  }

  return true;
};
