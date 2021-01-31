import {
  getApodImageForDate,
  getApodImagesForDateRange,
  getLatestEpicImages,
  getRoverManifest,
  getRoverImages,
} from "./api-calls.js";
import { store } from "./store.js";
import { updateAndRender, updateStore } from "./client.js";

/**
 * @description Returns a string representing a date in format YYYY-MM-DD
 * @return {string} date - A string representing a date
 */
const dateToStringConverter = (date) => {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
};

/**
 * @description Returns a string representing a date in format YYYY-MM-DD
 * @param {Date} date - A Date object
 * @param {function} cb - A higher order function that returns a string from a date
 * @return {string} date - A string representing a date
 */
const apodDateToString = (date, cb) => {
  return cb(date);
};

/**
 * @description Returns a Date from a string in format YYYY-MM-DD
 * @param {string} date - A string representing a date
 * @return {Date} date - A Date object
 */
const apodStringToDate = (date) => {
  return new Date(
    getDateWithTimeString(
      date !== "" ? date : apodDateToString(new Date(), dateToStringConverter)
    )
  );
};

/**
 * @description Returns a string representing a date in format YYYY-MM-DD
 * @param {object} image - An object representing an image
 * @param {object} state - The application's current state
 * @return {object} newState - The application's updated state
 */
const cacheImage = (image, state) => {
  const newCachedImgs = [...state.apod.cachedImgs, image];
  const newApod = Object.assign(state.apod, {
    cachedImgs: newCachedImgs,
    currentImg: image,
  });

  return updateAndRender(store, {
    menu: state.menu,
    apod: newApod,
    epic: state.epic,
    rovers: state.rovers,
  });
};

/**
 * @description Returns a an array of disabled dates
 * @param {object} apod - An object with information for the APOD API
 * @return {array} disabledDates - An array with disabled dates
 */
const getApodDisabledDates = (apod) => {
  return apod.disabledDates.map((date) => apodStringToDate(date));
};

/**
 * @description Returns a string representing a date with time information
 * @param {string} date - A string representing a date
 * @return {string} dateString - A string representing a date with time information
 */
const getDateWithTimeString = (date) => {
  const timeZoneOffset = new Date().getTimezoneOffset() / 60;

  if (timeZoneOffset > 0) {
    return date + "T" + String(timeZoneOffset).padStart(2, "0") + ":00:00";
  } else if (timeZoneOffset < 0) {
    return (
      date.substring(0, 8) +
      String(parseInt(date.substring(8, 10)) - 1).padStart(2, "0") +
      "T" +
      String(24 + timeZoneOffset).padStart(2, "0") +
      ":00:00"
    );
  } else {
    return date + "T00:00:00";
  }
};

/**
 * @description Returns the aspect ratio for the image
 * @param {object} image - An object representing and APOD image
 * @param {object} state - The application state
 * @return {float} aspectRatio - The image aspect ratio
 */
const getImageAspectRatio = (image, state) => {
  const img = new Image();
  img.src = image.url;

  img.onload = () => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const aspectRatio = (height / width) * 100;
    const newImage = Object.assign(image, { aspectRatio: aspectRatio });

    if (
      !state.apod.cachedImgs.map((image) => image.date).includes(image.date)
    ) {
      cacheImage(newImage, state);
    }

    return aspectRatio;
  };
};

/**
 * @description Updates the blockedDates array for the APOD API
 * @param {object} state - The application's current state
 * @return {object} newState - The application's updated state
 */
const getDisabledDates = (state) => {
  const apod = state.apod;
  const startDate = apod.checkedUntil;
  const endDate = apodDateToString(new Date(), dateToStringConverter);

  if (startDate !== endDate) {
    getApodImagesForDateRange(startDate, endDate).then((images) => {
      const newDisabledDates = images
        .filter((image) => image["media_type"] !== "image")
        .map((image) => image.date);

      if (newDisabledDates.length > 0) {
        const updatedDates = [...apod.disabledDates, ...newDisabledDates];
        const newApod = Object.assign(apod, {
          disabledDates: updatedDates,
          checkedUntil: endDate,
        });

        return updateStore(store, {
          menu: state.menu,
          apod: newApod,
          epic: state.epic,
          rovers: state.rovers,
        });
      }
    });
  }
};

/**
 * @description Gets the APOD image information from the backend
 * @param {string} date - A string representing a date in the format YYYY-MM-DD
 * @param {object} state - The application's state
 * @return {object} response - An object with the APOD image information
 */
const getApodImage = (date, state) => {
  const cachedImgsDates = state.apod.cachedImgs.map((image) => image.date);

  // The requested image is the current image.
  if (state.apod.currentImg && state.apod.currentImg.date === date) {
    return state.apod.currentImg;
    // The requested image is in the cache.
  } else if (cachedImgsDates.includes(date)) {
    return state.apod.cachedImgs.filter((image) => image.date === date)[0];
    // Get the new image from the API
  } else {
    getApodImageForDate(date).then((image) => {
      getImageAspectRatio(image, state);
      return {
        date: image.date,
        title: image.title,
        explanation: image.explanation,
        copyright: image.copyright,
        url: image.url,
        aspectRatio: "",
      };
    });
  }
};

/**
 * @description Gets the EPIC images information from the backend
 * @param {object} state - The application's state
 * @return {array} response - An array of EPIC images
 */
const getEpicImages = (state) => {
  return getLatestEpicImages().then((images) => {
    const year = images[0].date.substring(0, 4);
    const month = images[0].date.substring(5, 7);
    const day = images[0].date.substring(8, 10);
    const date = year + "-" + month + "-" + day;
    const latestImages = images.map((image) => {
      return {
        date: image.date,
        url: `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${image.image}.png`,
      };
    });
    const newEpic = Object.assign(state.epic, {
      date: date,
      images: latestImages,
    });

    return updateAndRender(store, {
      menu: state.menu,
      apod: state.apod,
      epic: newEpic,
      rovers: state.rovers,
    });
  });
};

/**
 * @description Updates the selected rover metadata from the manifest
 * @param {object} state - The application's current state
 * @return {object} newState - The application's updated state
 */
const getRoverInfo = (state) => {
  getRoverManifest(state.rovers.selectedRover).then((manifest) => {
    const name = manifest.photo_manifest.name;
    const cutOff = name === "Curiosity" ? -1 : name === "Spirit" ? -17 : -5;
    const photos = manifest.photo_manifest.photos;
    const missingSols = Array(photos.slice(-1)[0].sol)
      .fill()
      .map((x, i) => i)
      .filter((sol) => !photos.map((photo) => photo.sol).includes(sol));
    const disabledDates = missingSols.map((sol) => {
      const baseDate = apodStringToDate(photos[0].earth_date);
      return new Date(
        baseDate.setDate(
          baseDate.getDate() +
            sol +
            Math.floor(sol / 37) +
            Math.floor(sol / 1493)
        )
      );
    });
    const newRover = Object.assign(state.rovers, {
      selectedRover: state.rovers.selectedRover,
      selectedRoverInfo: {
        name: manifest.photo_manifest.name,
        minDate: apodStringToDate(photos[0].earth_date),
        maxDate: apodStringToDate(photos.slice(cutOff)[0].earth_date),
        disabledDates: disabledDates,
        startDate: apodStringToDate(photos.slice(cutOff)[0].earth_date),
        launchDate: manifest.photo_manifest.launch_date,
        landingDate: manifest.photo_manifest.landing_date,
        totalPhotos: manifest.photo_manifest.total_photos,
        completedDate: apodStringToDate(photos.slice(-1)[0].earth_date),
        status: manifest.photo_manifest.status,
      },
      photos: {
        reqDate: photos.slice(cutOff)[0].earth_date,
        date: "",
        images: [],
      },
    });

    return updateAndRender(store, {
      menu: state.menu,
      apod: state.apod,
      epic: state.epic,
      rovers: newRover,
    });

  });
};

/**
 * @description Updates the list of photos for a rover on a given date
 * @param {object} state - The application's current state
 * @return {object} newState - The application's updated state
 */
const getRoverPhotos = (state) => {
  getRoverImages(state.rovers.selectedRover, state.rovers.photos.reqDate).then(
    (photos) => {
      const images = photos.photos
        .filter((photo) =>
          ["FHAZ", "NAVCAM", "PANCAM", "RHAZ"].includes(photo.camera.name)
        )
        .map((photo) => photo.img_src);
      const newRover = Object.assign(state.rovers, {
        selectedRover: state.rovers.selectedRover,
        selectedRoverInfo: state.rovers.selectedRoverInfo,
        photos: {
          reqDate: state.rovers.photos.reqDate,
          date: state.rovers.photos.reqDate,
          images: [...images].sort(() => 0.5 - Math.random()).slice(0, 25),
        },
      });
      return updateAndRender(store, {
        menu: state.menu,
        apod: state.apod,
        epic: state.epic,
        rovers: newRover,
      });
    }
  );
};

export {
  apodDateToString,
  apodStringToDate,
  cacheImage,
  dateToStringConverter,
  getApodDisabledDates,
  getDateWithTimeString,
  getDisabledDates,
  getApodImage,
  getEpicImages,
  getRoverInfo,
  getRoverPhotos,
};
