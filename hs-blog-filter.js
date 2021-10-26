"use strict";
/* OPTIONS parameters
 * posts - objects to filter or sort
 *      {
 *        url: (string),
 *        title: (string),
 *        published: '',
 *        type: [{label: '', value: ''}],
 *        categories:[{label: '', value: ''}],
 *        body: (string),
 *        summary: (string),
 *        feat_img: (string)(url)
 *      }
 * postLength - posts per page
 * $handlebars - Handlebars template element
 * $list - List wrapper element
 * $loadmore - loadmore button wrapper element
 * $pagination - Pagination wrapper element
 * filters - (array) filter objects
 *      property - [array/string] object property to be filtered
 *      urlParam - parameter key to use
 *      type - 'dropdown' or 'keyword' or 'toggle'
 *      defaultText - default text for when nothing is selected
 *      wrapper - filter wrapper element
 * sorts - (array) sort objects
 *      urlParam - parameter key to use
 *      defaultText - default text for when nothing is selected
 *      wrapper - filter wrapper element
 *      options - object '{label: '', value: ''}'
 * onAfterItemsLoaded - function called after each page is shown
 * onAfterInit - function called after init()
 * */
function saltyBlogFilter(options) {
    var defaults = {
            posts: [],
            current: 1,
            postLength: 0,
            $handlebars: null,
            $list: null,
            $loadmore: null,
            $pagination: null,
            prevArrow: null,
            nextArrow: null,
            filters: [],
            sorts: [],
            onAfterItemsLoaded: null,
            onAfterInit: null,
        },
        settings = $.extend({}, defaults, options),
        filters = [],
        sorts = [],
        filteredPosts = [],
        debounce = function (callback, ms) {
            var timer = 0;
            return function () {
                var context = this,
                    args = arguments;

                clearTimeout(timer);
                timer = setTimeout(function () {
                    callback.apply(context, args);
                }, ms || 0);
            };
        },
        mergeArrays = function () {
            var mergedArray = [];

            for (var len = arguments.length, arrays = new Array(len), key = 0; key < len; key++) {
                arrays[key] = arguments[key];
            }

            arrays.forEach(function (array) {
                mergedArray = [].concat(mergedArray, array);
            });
            return Array.from(new Set(mergedArray));
        };

    if (!settings.postLength) {
        settings.postLength = settings.posts.length;
    }

    // initialize filters array
    if (settings.filters.length) {
        filters = settings.filters.reduce(function (acc, filterItem) {
            // Check if filterItem is valid
            if (filterItem.wrapper && filterItem.property) {
                // initialize "value"
                filterItem.value = null;

                // initialize "urlParam"
                if (!filterItem.urlParam) {
                    filterItem.urlParam = Array.isArray(filterItem.property) ? filterItem.property[0] : filterItem.property;
                }

                // initialize "defaultText"
                if (!filterItem.defaultText) {
                    filterItem.defaultText = "All";
                }

                filterItem.wrapper = $(filterItem.wrapper);

                // push to accumulator
                acc.push(filterItem);
            }

            return acc;
        }, []);
    }

    // initialize sorts array
    if (settings.sorts.length) {
        sorts = settings.sorts.reduce(function (acc, sortItem) {
            // check if sortItem is valid
            if (sortItem.wrapper && sortItem.options) {
                // initialize "value"
                sortItem.value = null;

                // initialize "defaultText"
                if (!sortItem.defaultText) {
                    sortItem.defaultText = "All";
                }

                sortItem.type = "dropdown";

                sortItem.wrapper = $(sortItem.wrapper);

                acc.push(sortItem);
            }

            return acc;
        }, []);
    }

    var dropdowns = filters.filter(function (item) {
            return item.type === "dropdown";
        }),
        keywords = filters.filter(function (item) {
            return item.type === "keyword";
        }),
        toggles = filters.filter(function (item) {
            return item.type === "toggle";
        });

    /*======================================*/
    /*============= GET PAGE ===============*/
    /*======================================*/
    var _getPage = function () {
        var first = (settings.current - 1) * settings.postLength,
            last = settings.current * settings.postLength,
            postsToShow = filteredPosts.slice(first, last),
            template = Handlebars.compile(settings.$handlebars.html());

        // empty the list first if it's using pagination
        if (settings.$pagination) {
            settings.$list.html("");
        }

        // append items on $list
        var toAppend = $(template(postsToShow));
        settings.$list.append(toAppend);

        // call callback
        if (settings.onAfterItemsLoaded && typeof settings.onAfterItemsLoaded === "function") {
            settings.onAfterItemsLoaded.call(this, settings);
        }

        // show/hide $loadmore
        if (settings.$loadmore) {
            if (filteredPosts.length <= last) {
                settings.$loadmore.hide();
            } else {
                settings.$loadmore.show();
            }
        }
    };

    /*======================================*/
    /*========== SET PAGINATION ============*/
    /*======================================*/
    var _setPagination = function () {
        if (settings.$pagination && filteredPosts.length) {
            var pages = Math.ceil(filteredPosts.length / settings.postLength),
                current = parseInt(settings.current),
                left = current - 2,
                right = pages;

            function navAppend(value, label, wrapper, customClass) {
                var item = [
                    "<li>",
                    '<a href="javascript:void(0);" class="' + customClass + '" data-page="' + value + '">',
                    label,
                    "</a>",
                    "</li>",
                ].join("");

                item = $(item);

                // check if active
                if (value === current) {
                    item.addClass("is-active");
                }

                // append to $pagination
                wrapper.append(item);
            }

            // if left less than 3 just set to 1
            if (left < 3) {
                left = 1;
            }

            right = left + 4;

            // set right to pages if more than
            if (right > pages) {
                right = pages;
            }

            // check to make sure left is valid
            if (pages - 4 > 0 && left > pages - 4) {
                left = pages - 4;
            }

            settings.$pagination.html("");

            if (settings.prevArrow) {
                navAppend("prev", settings.prevArrow, settings.$pagination, "page-prev");
                if (current === 1) {
                    settings.$pagination.find(".page-prev").addClass("page-disabled");
                }
            }

            // load pagination
            for (var i = left; i <= right; i++) {
                navAppend(i, i, settings.$pagination);
            }

            if (settings.nextArrow) {
                navAppend("next", settings.nextArrow, settings.$pagination, "page-next");
                if (current === pages) {
                    settings.$pagination.find(".page-next").addClass("page-disabled");
                }
            }
        }
    };

    /*======================================*/
    /*========= GET URL PARAMETER ==========*/
    /*======================================*/
    var _getUrlParameter = function (parameter) {
        parameter = parameter.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var url = document.location.href;
        var regex = new RegExp("[\\?|&]" + parameter.toLowerCase() + "=([^&#]*)");
        var results = regex.exec("?" + url.toLowerCase().split("?")[1]);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    /*======================================*/
    /*========= SET URL PARAMETER ==========*/
    /*======================================*/
    var _setUrlParameter = function (key, value) {
        var key = encodeURIComponent(key),
            value = encodeURIComponent(value),
            url = document.location.href;

        var baseUrl = url.split("?")[0],
            newParam = key + "=" + value,
            params = "?" + newParam,
            urlQueryString = "";

        if (url.split("?")[1] == undefined) {
            urlQueryString = "";
        } else {
            urlQueryString = "?" + url.split("?")[1];
        }

        if (urlQueryString) {
            var updateRegex = new RegExp("([?&])" + key + "[^&]*");
            var removeRegex = new RegExp("([?&])" + key + "=[^&;]+[&;]?");

            if (typeof value === "undefined" || value === null || value === "") {
                params = urlQueryString.replace(removeRegex, "$1");
                params = params.replace(/[&;]$/, "");
            } else if (urlQueryString.match(updateRegex) !== null) {
                params = urlQueryString.replace(updateRegex, "$1" + newParam);
            } else if (urlQueryString == "") {
                params = "?" + newParam;
            } else {
                params = urlQueryString + "&" + newParam;
            }
        }

        params = params === "?" ? "" : params;

        history.pushState("", "", baseUrl + params);
    };

    /*======================================*/
    /*============ FILTER POSTS ============*/
    /*======================================*/
    var _filterPosts = function () {
        // check value by filter type
        function checkValByType(postProp, tofilter, type) {
            var isEqual = false;

            switch (type) {
                case "dropdown":
                    isEqual = postProp.value.toLowerCase() === tofilter.toLowerCase();
                    break;
                case "keyword":
                    if (typeof postProp === "object") {
                        isEqual = new RegExp(tofilter.toLowerCase()).test(postProp.value.toLowerCase());
                    } else {
                        isEqual = new RegExp(tofilter.toLowerCase()).test(postProp.toLowerCase());
                    }
                    break;
                case "toggle":
                    isEqual = tofilter.length === 0 || tofilter.includes(postProp.value);
                    break;
            }

            return isEqual;
        }

        // Check property value
        function isPropInvalid(postProp, toFilter, type) {
            if (Array.isArray(postProp)) {
                var found = postProp.filter(function (item) {
                    return checkValByType(item, toFilter, type);
                });

                return found.length === 0;
            } else {
                var check = checkValByType(postProp, toFilter, type);
                return !check;
            }
        }

        function handlePostLoop(acc, _post) {
            var invalidArr = [];
            // loop through filters
            filters.forEach(function (filterItem) {
                if (filterItem.value) {
                    if (Array.isArray(filterItem.property)) {
                        var found = filterItem.property.filter(function (property) {
                            if (_post[property]) {
                                return !isPropInvalid(_post[property], filterItem.value, filterItem.type);
                            } else {
                                return false;
                            }
                        });

                        if (found.length === 0) {
                            invalidArr.push(filterItem.property);
                        }
                    } else if (_post[filterItem.property]) {
                        if (isPropInvalid(_post[filterItem.property], filterItem.value, filterItem.type)) {
                            invalidArr.push({
                                property: filterItem.property,
                                value: _post[filterItem.property],
                            });
                        }
                    } else {
                        invalidArr.push({
                            property: filterItem.property,
                            value: "",
                        });
                    }
                }
            });

            if (invalidArr.length === 0) {
                acc.push(_post);
            }

            return acc;
        }

        filteredPosts = settings.posts.reduce(handlePostLoop, []);
    };

    /*======================================*/
    /*============= SORT POSTS =============*/
    /*======================================*/
    var _sortPosts = function () {
        function getPostProperty(post, property) {
            var value = false;

            // check post has that property
            if (post[property]) {
                value = post[property];

                if (Array.isArray(value)) {
                    if (value.length) {
                        value = value[0].value;
                    } else {
                        value = false;
                    }
                }
            }
            return value;
        }

        function handlePostLoop(post1, post2) {
            var property = sortItem.value,
                k1 = getPostProperty(post1, property),
                k2 = getPostProperty(post2, property);

            switch (property) {
                case "published":
                    return k2 - k1;
                default:
                    var v1 = k1,
                        v2 = k2,
                        comparison = 0;

                    // lowercase the values if String
                    if (typeof v1 === "string") {
                        v1 = v1.toLowerCase();
                    }
                    if (typeof v2 === "string") {
                        v2 = v2.toLowerCase();
                    }

                    if (v1 > v2) {
                        comparison = 1;
                    } else if (v1 < v2) {
                        comparison = -1;
                    }

                    return comparison;
            }
        }

        /* sorts.forEach(function(sortItem) {
    if (sortItem.value) {
      filteredPosts.sort(handlePostLoop);
    }
  }); */
    };

    /*======================================*/
    /*=========== SET FILTER DOM ===========*/
    /*======================================*/
    var _setDOMFilters = function () {
        function findItemByProp(item, list, prop) {
            return list.find(function (k) {
                return k[prop] === item[prop];
            });
        }

        // value => post propert value
        // list => filter list
        function pushToList(value, list) {
            var _list = [];
            if (Array.isArray(value)) {
                var unique = value.filter(function (item) {
                    var found = findItemByProp(item, list, "value");
                    return !found;
                });
                _list = mergeArrays(list, unique);
            } else {
                var found = findItemByProp(value, list, "value");
                if (!found) {
                    _list = mergeArrays(list, [value]);
                } else {
                    _list = list;
                }
            }
            return _list;
        }

        // item => filter/sort item
        // list => list of dropdown items
        function createDropdown(item, list) {
            var $ddlist = item.wrapper.find(".dropdown-list").eq(0),
                template = function (value, label, isActive) {
                    var classActive = isActive ? "is-active" : "",
                        d = ["<li>", '<a href="javascript:void(0);" class="' + classActive + '" data-value="' + value + '">', label, "</a>", "</li>"];
                    return $(d.join(""));
                };

            $ddlist.append(template("", "All", true));

            for (var key = 0; key < list.length; key++) {
                var _dd = list[key],
                    dom = template(_dd.value, _dd.label, false);

                $ddlist.append(dom);

                if (item.value && _dd.value.toLowerCase() === item.value.toLowerCase()) {
                    _selectDropdown(
                        {
                            element: item.wrapper.find(".dropdown-label"),
                            value: _dd.label,
                        },
                        {
                            wrapper: $ddlist,
                            selected: dom.find("a"),
                        }
                    );
                }
            }
        }

        // item => filter/sort item
        // list => list of dropdown items
        function createToggle(item, list) {
            var $toggleList = item.wrapper.find(".toggle-list").eq(0),
                template = function (value, label, isActive) {
                    var classActive = isActive ? "is-active" : "",
                        d = [
                            "<li>",
                            '<a href="javascript:void(0);" class="' + classActive + '" data-value="' + value + '">',
                            '<span class="toggle-checkbox"></span>',
                            label,
                            "</a>",
                            "</li>",
                        ];

                    return $(d.join(""));
                };

            for (var key = 0; key < list.length; key++) {
                var _tt = list[key],
                    dom = template(_tt.value, _tt.label, false);

                $toggleList.append(dom);

                if (item.value && item.value.includes(_tt.value)) {
                    _selectToggle(
                        {
                            wrapper: $toggleList,
                            selected: dom.find("a"),
                        },
                        true
                    );
                }
            }
        }

        // handle loop for each filters/sorts
        function handleLoop(list, type) {
            var itemList = [],
                properties = Array.isArray(list.property) ? list.property : [list.property],
                values = settings.posts.reduce(function (acc, item, idx) {
                    var _props = Object.keys(item);

                    for (var key = 0; key < _props.length; key++) {
                        if (properties.includes(_props[key]) && item[_props[key]]) {
                            acc.push(item[_props[key]]);
                        }
                    }

                    return acc;
                }, []);

            values.forEach(function (item) {
                itemList = pushToList(item, itemList);
            });

            itemList.sort(function (val1, val2) {
                var v1 = val1.label.toLowerCase(),
                    v2 = val2.label.toLowerCase(),
                    comparison = 0;

                if (v1 < v2) {
                    comparison = 1;
                } else if (v1 > v2) {
                    comparison = -1;
                }

                return comparison;
            });

            if (list.wrapper) {
                var classpre = list.type;

                list.wrapper.html("");
                list.wrapper.append('<label class="' + classpre + '-label">' + list.defaultText + "</label>");
                list.wrapper.append('<ul class="' + classpre + '-list"></ul>');
            }

            switch (type) {
                case "dropdown":
                    createDropdown(list, itemList);
                    break;
                case "toggle":
                    createToggle(list, itemList);
                    break;
            }
        }

        dropdowns.forEach(function (item) {
            handleLoop(item, "dropdown");
        });
        toggles.forEach(function (item) {
            handleLoop(item, "toggle");
        });
        /* sorts.forEach(function(item) {
    handleLoop(item, "dropdown");
  }); */
    };

    /*======================================*/
    /*======== SELECT DROPDOWN ITEM ========*/
    /*======================================*/
    var _selectDropdown = function (label, anchor) {
        var defLabel = {
                element: "",
                value: "",
            },
            defAnchor = {
                wrapper: "",
                selected: "",
            },
            _label = $.extend({}, defLabel, label),
            _anchor = $.extend({}, defAnchor, anchor);

        if (_label.element && _label.value) {
            _label.element.text(_label.value);
        }
        if (_anchor.wrapper) {
            _anchor.wrapper.find(".is-active").removeClass("is-active");
        }
        if (_anchor.selected) {
            _anchor.selected.addClass("is-active");
        }
    };

    /*======================================*/
    /*========= SELECT TOGGLE ITEM =========*/
    /*======================================*/
    var _selectToggle = function (anchor, isSelected) {
        var defAnchor = {
                wrapper: "",
                selected: "",
            },
            _anchor = $.extend({}, defAnchor, anchor);

        if (_anchor.selected) {
            if (isSelected) {
                _anchor.selected.addClass("is-active");
            } else {
                _anchor.selected.removeClass("is-active");
            }
        }
    };

    /*======================================*/
    /*=============== RESET ================*/
    /*======================================*/
    var _reset = function () {
        if (_getUrlParameter("page")) {
            _setUrlParameter("page", settings.current);
        }
        settings.$list.html("");
        _filterPosts();
        _sortPosts();
        _setPagination();
        _getPage();
    };

    /*======================================*/
    /*============ INITIALIZE ==============*/
    /*======================================*/
    var _init = function () {
        // bind dropdown fields
        var ddItems = mergeArrays(dropdowns, toggles /* , sorts */),
            ddDOMs = ddItems.map(function (item) {
                return item.wrapper;
            }),
            // Array for the different filter
            // function on item click
            dropdownFunctionArray = [
                {
                    type: "dropdown",
                    do: function (item, _this, value, label) {
                        item.value = value || "";

                        if (!item.value) {
                            label = item.defaultText;
                        }

                        _selectDropdown(
                            {
                                element: item.wrapper.find(".dropdown-label"),
                                value: label,
                            },
                            {
                                wrapper: item.wrapper.find(".dropdown-list"),
                                selected: _this,
                            }
                        );
                        _setUrlParameter(item.urlParam, item.value);
                    },
                },
                {
                    type: "toggle",
                    do: function (item, _this, value, label) {
                        if (!Array.isArray(item.value)) {
                            item.value = [];
                        }
                        var isPushToValue = !item.value.includes(value);

                        if (value && isPushToValue) {
                            item.value.push(value);
                        } else {
                            item.value = item.value.filter(function (i) {
                                return i !== value;
                            });
                        }

                        _selectToggle(
                            {
                                wrapper: item.wrapper.find(".toggle-list"),
                                selected: _this,
                            },
                            isPushToValue
                        );
                        if (item.value.length === 0) {
                            _setUrlParameter(item.urlParam, "");
                        } else {
                            _setUrlParameter(item.urlParam, JSON.stringify(item.value));
                        }
                    },
                },
            ];

        ddItems.forEach(function (dd) {
            var eventsDD = false,
                hasLabelToggle = false;
            if (dd.wrapper.length) {
                eventsDD = $._data(dd.wrapper[0], "events");
            }
            if (eventsDD && eventsDD.click) {
                hasLabelToggle = eventsDD.click.find(function (ev) {
                    return ev.selector === ".dropdown-label, .toggle-label";
                });
            }

            if (!hasLabelToggle) {
                dd.wrapper.on("click", ".dropdown-label, .toggle-label", function (e) {
                    dd.wrapper.toggleClass("is-open");
                });
            }

            var selectedDFA = dropdownFunctionArray.find(function (item) {
                return dd.type === item.type;
            });

            dd.wrapper.on("click", "." + selectedDFA.type + "-list a", function (e) {
                event.preventDefault();
                var _this = $(this),
                    value = _this.data("value"),
                    label = _this.text() || dd.defaultText;

                selectedDFA.do(dd, _this, value, label);

                dd.wrapper.removeClass("is-open");

                settings.current = 1;
                _reset();
            });

            var parameter = _getUrlParameter(dd.urlParam);
            if (parameter) {
                dd.value = parameter;

                if (dd.type === "toggle") {
                    dd.value = JSON.parse(dd.value);
                }
            }
        });
        $(window).on("click", function (event) {
            ddDOMs.forEach(function (item) {
                if (item[0] !== event.target && !item[0].contains(event.target) && item.hasClass("is-open")) {
                    item.removeClass("is-open");
                }
            });
        });

        // bind search fields
        keywords.forEach(function (item) {
            item.wrapper.on(
                "keyup search",
                ".keyword-search",
                debounce(function (e) {
                    item.value = this.value || "";
                    _setUrlParameter(item.urlParam, item.value);
                    settings.current = 1;
                    _reset();
                }, 600)
            );

            var parameter = _getUrlParameter(item.urlParam);
            if (parameter) {
                item.value = parameter;
                item.wrapper.find(".keyword-search").val(parameter);
            }
        });

        // bind pagination items
        if (settings.$pagination) {
            settings.$pagination.on("click", "a, .page-prev, .page-next", function (e) {
                e.preventDefault();
                if ($(this).hasClass("page-disabled")) {
                    return false;
                }
                var value = $(this).data("page").toString();
                switch (value) {
                    case "prev":
                        settings.current = settings.current - 1;
                        break;
                    case "next":
                        settings.current = settings.current + 1;
                        break;
                    default:
                        settings.current = parseInt(value);
                        break;
                }

                _setUrlParameter("page", settings.current);
                _setPagination();
                _getPage();
            });
        }

        // bind loadmore item
        if (settings.$loadmore) {
            settings.$loadmore.on("click", ".page-more", function (e) {
                e.preventDefault();
                settings.current = settings.current + 1;
                _getPage();
            });
        }

        // initialize posts
        settings.current = parseInt(_getUrlParameter("page")) || 1;
        _setDOMFilters();
        _reset();

        if (settings.onAfterInit && typeof settings.onAfterInit === "function") {
            settings.onAfterInit.call(this, settings);
        }
    };

    return {
        init: _init,
    };
}
