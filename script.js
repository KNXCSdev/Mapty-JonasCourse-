"use strict";

class workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // click() {
  //   this.clicks++;
  // }
}

class Running extends workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cyc1 = new Cycling([28, -13], 27, 95, 523);
// console.log(run1, cyc1);

///////////////////////////////////////////////
////SECTION APPLICATION ARCHITECTURE

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    //GET USERS POSITION
    this._getPosition();

    // GET DATA FROM LOCAL STORAGE
    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    document.querySelector(".btn-sort").addEventListener("click", this._sortWorkout.bind(this));
    containerWorkouts.addEventListener("click", this._deleteWorkout.bind(this));
    document
      .querySelector(".btn-delete-all")
      .addEventListener("click", this._deleteAllWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert("Could not get your position");
      });
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
      this._renderWorkout(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField(e) {
    //NOTE CLOSEST.CLASSLIST.TOGGLE CHANGES THE CLASS OF THE CLOSEST() NOT THE INPUT
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //if activity running,create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      //check if data is valid
      //NOTE ISFINITE CHECKS IF INPUT IS A NUMBER
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
        return alert("Inputs have to be positive numbers");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //if workout cycling,create cycling object
    if (type === "cycling") {
      //check if data is valid
      const elevation = +inputElevation.value;

      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
        return alert("Inputs have to be positive numbers");

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //aDD NEW OBECT TO WORKOUT ARRAY
    this.#workouts.push(workout);

    //RENDER WORKOUT ON MAP AS MARKER
    this._renderWorkoutMarker(workout);

    //reNDER WORKOUT ON A LIST
    this._renderWorkout(workout);

    //CLEAR INPUT FIELDS
    this._hideForm();

    // //Set local storage to workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          maxHeight: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"} ${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <button class='workout__delete-btn'><ion-icon name="close-circle-outline"></ion-icon></button>
          <button class='workout__edit-btn'><ion-icon name="create-outline"></ion-icon></button>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === "running")
      html += `  
           <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === "cycling")
      html += `          
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div></li>`;

    form.insertAdjacentHTML("afterend", html);
  }

  _deleteWorkout(e) {
    const clicked = e.target.closest(".workout__delete-btn");

    if (!clicked) return;

    const workoutEl = clicked.closest(".workout");
    const workoutId = workoutEl.dataset.id;

    const workoutIndex = this.#workouts.findIndex((work) => work.id === workoutId);

    if (workoutIndex !== -1) {
      this.#workouts.splice(workoutIndex, 1);

      workoutEl.remove();

      this._setLocalStorage();
      this.reset();
    }
  }

  _deleteAllWorkout() {
    localStorage.clear();
    this.reset();
  }

  _sortWorkout() {
    // Sort workouts by distance
    this.#workouts.sort((a, b) => a.distance - b.distance);

    // Clear the current list
    document.querySelectorAll(".workout").forEach((work) => work.remove());

    // Render sorted workouts
    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    const workoutData = this.#workouts.find((work) => work.id === workoutEl.dataset.id);

    this.#map.setView(workoutData.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
    // workoutData.click();
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    this.#workouts = data;

    // this.#workouts.forEach((work) => {
    //   this._renderWorkout(work);
    // });
  }

  reset() {
    // localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
