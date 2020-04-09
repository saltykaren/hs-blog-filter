# hs-blog-filter

## How to use

    (function() {
        var $list = $("#blog_listing"),
          filter = saltyBlogFilter({
            posts: $list.data("posts"),
            postLength: 12,
            $handlebars: $("#post_hb_template"),
            $list: $list,
            $loadmore: $("#blog_listing_action"),
            prevArrow: "",
            nextArrow: ""
            filters: [
              {
                property: "tags",
                urlParam: "tag",
                type: "dropdown",
                defaultText: "All articles",
                wrapper: $("#blog_listing_filters")
              }
            ]
          });

        filter.init();
      })();

## Options

### posts

array of objects to be filtered or sort

Sample "posts" item value

    {
        name: "Why time tracking in Excel costs money - 5"
        feat_img: "https://cdn2.hubspot.net/hubfs/6920653/Blog%20visuals/05_6_Time_Management_Hacks_541x290.png"
        feat_img_lazy: "https://cdn2.hubspot.net/hub/6920653/hubfs/Blog%20visuals/05_6_Time_Management_Hacks_541x290.png?length=10&name=05_6_Time_Management_Hacks_541x290.png"
        feat_img_alt: ""
        summary: "By creating an Account on our service, you agree to subscribe to newsletters, marketing or "
        tags:[
            {label: "HubSpot", value: "hubspot"}
        ]
        posturl: "http://www.psohub.com/837636534-test-9866-blog/why-time-tracking-in-excel-costs-money-5"
    }

This is just a sample object. These properties can be different.

NOTE: if you want to filter a certain property they will need to have a "label" and a "value" just like the "tags" property in the example

### postLength

- posts to show per page
- defaults to show all posts

### \$handlebars

- a jQuery DOM object for your handlebar template

### \$list

- a jQuery DOM object
- wrapper for your list

### \$loadmore

- wrapper for your loadmore button. The action element needs to have a class of "page-more"

### \$pagination

- wrapper for the pagination
- THIS IS NOT TESTED YET

### prevArrow

- if you want to have "previous" button for your pagination
- THIS IS NOT TESTED YET

### nextArrow

- if you want to have "next" button for your pagination
- THIS IS NOT TESTED YET

### filters

- array of filter objects

  filter item parameters

        { 
            property: [array/string] post object property you want to filter, 
            urlParam: a url parameter key you want to use when this filter has value, 
            type: ["dropdown", "keyword", "toggle"], 
            defaultText: the label for this filter, 
            wrapper: jQuery DOM object that will contain the different possible filters 
        }

  NOTE: when using "keyword" the input element needs to have a class of 'keyword-search'

  a "is-open" class will be added to the filter wrapper when dropdown is open
  
  a "is-active" class will be added to the selected dropdown item

### sorts

- COMING SOON.

### onAfterItemsLoaded

- callback every time a page is loaded

### onAfterInit

- callback after initializing


## NOTE: open sample/index.html to see a sample 
