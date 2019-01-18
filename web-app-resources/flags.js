class Flags {
  constructor() {
    this.model = {};
  }
  //sets localStorage when value is changed
  setCache(cname, cvalue)
  {
    localStorage.setItem(cname, JSON.stringify(cvalue));
  }
  cachedValueExists(cname)
  {
    return (localStorage.getItem(cname) != null) ? true : false;
  }
  getCache(cname)
  {
    let cached_data = localStorage.getItem(cname);
    return (cached_data !== "undefined") ? JSON.parse(cached_data) : null;
  }
  get(id) {
    return this.model[id]["data"];
  }
  bind(id, update_callback, default_value) {
    this.model[id] = {
      "data": default_value,
      "change_event": update_callback,
    };
  }
  attach(id, event_type, default_value, element_callback, update_callback) {
    let element = document.querySelector(`#${id}`);
    // If element doesn't exist do not attempt to attach flag listeners to it
    if (!element) {
      console.error(`Could not find DOM element corresponding to id #${id}`);
      return false;
    }
    // Assume that the element is a <select><option> combo box
    let property = "value";
    if (element.type === "checkbox") {
      property = "checked";
    }
    // Setup event listener on element
    element.addEventListener(event_type, () => {
      // Get value of element and remove quotes with
      var val = element[property];
      // Save the value to the IDs name in LocalStorage
      this.model[id]["data"] = val;
      // Call their element_callback if it exists
      if (element_callback) {
        element_callback(val, element);
      }
    });
    // Create a wrapper function that updates the elements property and calls
    // update callback if it exists.
    let input_updater = (value) => {
      element[property] = value;
      if (update_callback) {
        update_callback(value, id);
      }
    };

    this.bind(id, input_updater, default_value);
  }
  set(id, value) {
    this.model[id] = value;
    if (typeof this.model[id]["change_event"] === "function") {
      this.model[id]["change_event"](value, id);
    }
  }
  initialize() {
    console.debug("Initializing Flags!");
    for (var id in this.model) {
      let cached_data = this.getCache(id);
      if (cached_data) {
        this.model[id]["data"] = cached_data;
      }
      if (this.model[id]["data"]) {
        this.model[id]["change_event"](this.model[id]["data"], id);
      }
    }
  }
  teardown() {
    console.debug("Saving flags to LocalStorage!");
    for (var id in this.model) {
      if (typeof this.model[id]["data"] !== "undefined" &&
          this.model[id]["data"] !== null) {
        this.setCache(id, this.model[id]["data"]);
      }
    }
  }
}
