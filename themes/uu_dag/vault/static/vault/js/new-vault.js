"use strict";

$(document).ajaxSend(function(e, request, settings) {
    // Append a CSRF token to all AJAX POST requests.
    if (settings.type === 'POST' && settings.data.length) {
         settings.data
             += '&' + encodeURIComponent(Yoda.csrf.tokenName)
              + '=' + encodeURIComponent(Yoda.csrf.tokenValue);
    }
});

let preservableFormatsLists = null;
let currentFolder;

$(function() {
    // Extract current location from query string (default to '').
    currentFolder = decodeURIComponent((/(?:\?|&)dir=([^&]*)/
                                        .exec(window.location.search) || [0,''])[1]);

    currentFolder = browseStartDir //'/vault-pilot/deposit-pilot[1644396517][1644396567]'
    console.log(currentFolder)
    // Canonicalize path somewhat, for convenience.
    currentFolder = currentFolder.replace(/\/+/g, '/').replace(/\/$/, '');

    if ($('#file-browser').length) {
        startBrowsing(browsePageItems);
    }

    $('.btn-show-file-browser').click(function(){
        if ($('.breadcrumbs-browser').hasClass('hidden')) {
            $('.breadcrumbs-browser').removeClass('hidden');
            $('.metadata-details').addClass('hidden');
            $(this).text('Details');
        }
        else {
            $('.breadcrumbs-browser').addClass('hidden');
            $('.metadata-details').removeClass('hidden');
            $(this).text('Data access');
        }
    });

    $('.btn-copy-to-clipboard').click(function(){
        alert('click');
        // var text = $('.metadata-identifier').val();
        textToClipboard($('.metadata-identifier').text());
        alert('Copied to clipboard: ' + $('.metadata-identifier').text());
    });


    $("body").on("click", "a.view-video", function() {
        let path = $(this).attr('data-path');
        let viewerHtml = `<video width="570" controls autoplay><source src="browse/download?filepath=${htmlEncode(encodeURIComponent(path))}"></video>`;
        $('#viewer').html(viewerHtml);
        $('#viewMedia').modal('show');
    });

    $("body").on("click", "a.view-audio", function() {
        let path = $(this).attr('data-path');
        let viewerHtml = `<audio width="570" controls autoplay><source src="browse/download?filepath=${htmlEncode(encodeURIComponent(path))}"></audio>`;
        $('#viewer').html(viewerHtml);
        $('#viewMedia').modal('show');
    });

    $("body").on("click", "a.view-image", function() {
        let path = $(this).attr('data-path');
        let viewerHtml = `<img width="570" src="browse/download?filepath=${htmlEncode(encodeURIComponent(path))}" />`;
        $('#viewer').html(viewerHtml);
        $('#viewMedia').modal('show');
    });

    $("#viewMedia.modal").on("hidden.bs.modal", function() {
        $("#viewer").html("");
    });

    $("body").on("click", "i.actionlog-icon", function() {
        toggleActionLogList($(this).attr('data-folder'));
    });

    $("body").on("click", "i.system-metadata-icon", function() {
        toggleSystemMetadata($(this).attr('data-folder'));
    });

    $("body").on("click", ".browse", function(e) {
        browse($(this).attr('data-path'), true);
        // Dismiss stale messages.
        $('#messages .close').click();
        e.preventDefault();
    });
});


function toggleActionLogList(folder)
{
    let actionList = $('.actionlog');
    let actionListItems = $('.actionlog-items');

    let isVisible = actionList.is(":visible");

    // toggle locks list
    if (isVisible) {
        actionList.hide();
    } else {
        Yoda.call('provenance_log', {coll: Yoda.basePath + folder}).then((data) => {
            actionList.hide();
            var html = '';
            if (data.length) {
                $.each(data, function (index, value) {
                    html += '<a class="list-group-item list-group-item-action">'
                         + htmlEncode(value[2])
                         + ' - <strong>'
                         + htmlEncode(value[1])
                         + '</strong> - '
                         + htmlEncode(value[0])
                         + '</a>';
                });
            } else {
                html += '<a class="list-group-item list-group-item-action">No provenance information present</a>';
            }
            actionListItems.html(html)
            actionList.show();
        });
    }
}


function toggleSystemMetadata(folder)
{
    let systemMetadata = $('.system-metadata');
    let systemMetadataItems = $('.system-metadata-items');

    let isVisible = systemMetadata.is(":visible");

    // Toggle system metadata.
    if (isVisible) {
        systemMetadata.hide();
    } else {
        Yoda.call('vault_system_metadata', {coll: Yoda.basePath + folder}).then((data) => {
            systemMetadata.hide();
            var html = '';
            if (data) {
                $.each(data, function(index, value) {
                    html += '<span class="list-group-item list-group-item-action"><strong>' +
                        htmlEncode(index) +
                        '</strong>: ' +
                        value +
                        '</span>';
                });
            } else {
                html += '<a class="list-group-item list-group-item-action">No system metadata present</a>';
            }
            systemMetadataItems.html(html);
            systemMetadata.show();
        });
    }
}



function browse(dir = '', changeHistory = false)
{
    currentFolder = dir;
    makeBreadcrumb(dir);
    metadataInfo(dir);
    topInformation(dir, true); //only here topInformation should show its alertMessage
    buildFileBrowser(dir);
}

function makeBreadcrumb(dir)
{
    let pathParts = dir.split('/').filter(x => x.length);

    // [[Crumb text, Path]] - e.g. [...['x', '/research-a/x']]
    let crumbs = [['VaultHDR', ''],
                  ...Array.from(pathParts.entries())
                          .map(([i,x]) => [x, '/'+pathParts.slice(0, i+1).join('/')])];

    let html = '';
    for (let [i, [text, path]] of crumbs.entries()) {
        if (i > 1) {
            let el = $('<li class="breadcrumb-item">');
            if (i == 2) { 
                text = 'Datapackage'; }
            text = htmlEncode(text).replace(/ /g, '&nbsp;');
            if (i === crumbs.length-1)
                el.addClass('active').html(text);
            else el.html(`<a class="browse" data-path="${htmlEncode(path)}"
                             href="?dir=${encodeURIComponent(path)}">${text}</a>`);

            html += el[0].outerHTML;
        }
    }

    $('ol.breadcrumb').html(html);
}

function htmlEncode(value){
    //create a in-memory div, set it's inner text(which jQuery automatically encodes)
    //then grab the encoded contents back out.  The div never exists on the page.
    return $('<div/>').text(value).html().replace('"', '&quot;');
}

function buildFileBrowser(dir) {
    let fileBrowser = $('#file-browser').DataTable();
    getFolderContents.dropCache();
    fileBrowser.ajax.reload();

    return true;
}

// Fetches directory contents to populate the listing table.
let getFolderContents = (() => {
    // Close over some state variables.
    // -> we keep a multi-page cache handy, since getting only $page_length [=10]
    //    results each time is wasteful and slow.
    // A change in sort column/order or folder will invalidate the cache.

    // The amount of rows to request at once.
    // *Must* be equal to or greater than the largest datatables page length,
    // and *should* be smaller than iRODS SQL rows per batch.
    const batchSize = 200;
    // (~140 B per entry in JSON returned by iRODS,
    //  so depending on name = up to 28K to transfer for each fetch)

    let total          = false; // Total subcollections / data objects.
    let cache          = [];    // Cached result rows (may be more than shown on one page).
    let cacheStart     = null;  // Row number of the first cache entry.
    let cacheFolder    = null;  // Folder path of the cache.
    let cacheSortCol   = null;  // Cached sort column nr.
    let cacheSortOrder = null;  // Cached sort order.
    let i = 0;                  // Keep simultaneous requests from interfering.

    let get = async (args) => {
        // Check if we can use the cache.
        if (cache.length
         && currentFolder        === cacheFolder
         && args.order[0].dir    === cacheSortOrder
         && args.order[0].column === cacheSortCol
         && args.start               >= cacheStart
         && args.start + args.length <= cacheStart + batchSize) {

            return cache.slice(args.start - cacheStart, args.start - cacheStart + args.length);
        } else {
            // Nope, load new data via the API.
            let j = ++i;
            let result = await Yoda.call('browse_folder',
                                         {'coll':       Yoda.basePath + currentFolder,
                                          'offset':     args.start,
                                          'limit':      batchSize,
                                          'sort_order': args.order[0].dir,
                                          'sort_on':    ['name','size','modified'][args.order[0].column],
                                          'space':      'Space.VAULT'});

            // If another requests has come while we were waiting, simply drop this one.
            if (i !== j) return null;

            // Populate the 'size' of collections so datatables doesn't get confused.
            for (let x of result.items)
                if (x.type === 'coll')
                    x.size = 0;

            // Update cache info.
            total          = result.total;
            cacheStart     = args.start;
            cache          = result.items;
            cacheFolder    = currentFolder;
            cacheSortCol   = args.order[0].column;
            cacheSortOrder = args.order[0].dir;

            return cache.slice(args.start - cacheStart, args.length);
        }
    };

    // The actual function passed to datatables.
    // (needs a non-async wrapper cause datatables won't accept it otherwise)
    let fn = (args, cb, settings) => (async () => {

        let data = await get(args);
        if (data === null)
            return;

        cb({'data':            data,
            'recordsTotal':    total,
            'recordsFiltered': total });
    })();

    // Allow manually clearing results (needed during soft-reload after uploading a file).
    fn.dropCache = () => cache = [];
    return fn;
})();

// Functions for rendering table cells, per column.
const tableRenderer = {
    name: (name, _, row) => {
         let tgt = `${currentFolder}/${name}`;
         if (row.type === 'coll')
              return `<a class="coll browse" href="?dir=${encodeURIComponent(tgt)}" data-path="${htmlEncode(tgt)}"><i class="fa fa-folder-o"></i> ${htmlEncode(name)}</a>`;
         else return `<i class="fa fa-file-o"></i> ${htmlEncode(name)}`;
    },
    size: (size, _, row) => {
        if (row.type === 'coll') {
            return '';
        } else {
            let szs = ['B', 'kiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
            let szi = 0;
            while (size >= 1024 && szi < szs.length-1) {
                size /= 1024;
                szi++;
            }
            return (Math.floor(size*10)/10+'') + '&nbsp;' + szs[szi];
        }
    },
    date: ts => {
         let date = new Date(ts*1000);
         let pad = n => n < 10 ? '0'+n : ''+n;
         let elem = $('<span>');
         elem.text(`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
                 + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`);
         elem.attr('title', date.toString()); // (should include seconds and TZ info)
         return elem[0].outerHTML;
    },
    context: (_, __, row) => {
        let actions = $('<span>');

        if (row.type === 'coll')
            return '';

        // Render context menu for files.
        const viewExts = {
            image: ['jpg', 'jpeg', 'gif', 'png'],
            audio: ['mp3', 'ogg', 'wav'],
            video: ['mp4', 'ogg', 'webm']
        };
        let ext = row.name.replace(/.*\./, '').toLowerCase();

        actions.append(`<a href="browse/download?filepath=${encodeURIComponent(currentFolder + '/' + row.name)}" title="Download this file"><i class="fa fa-download"></a>`);

        // Generate dropdown "view" actions for different media types.
        for (let type of Object.keys(viewExts).filter(type => (viewExts[type].includes(ext)))) {
            actions.append(`<a class="dropdown-item view-${type}" data-path="${htmlEncode(currentFolder + '/' + row.name)}" title="View this file"><i class="fa fa-eye"></a>`);
        }

        return actions[0].innerHTML;
    }
};

function startBrowsing(items)
{
    $('#file-browser').DataTable({
        "bFilter": false,
        "bInfo": false,
        "bLengthChange": true,
        "language": {
            "emptyTable": "No accessible files/folders present",
            "lengthMenu": "_MENU_"
        },
        "dom": '<"top">frt<"bottom"lp><"clear">',
        'columns': [{render: tableRenderer.name,    data: 'name'},
                    // Size and date should be orderable, but limitations
                    // on how queries work prevent us from doing this
                    // correctly without significant overhead.
                    // (enabling this as is may result in duplicated results for data objects)
                    {render: tableRenderer.size,    orderable: false, data: 'size'},
                    {render: tableRenderer.date,    orderable: false, data: 'modify_time'},
                    {render: tableRenderer.context, orderable: false }],
        "ajax": getFolderContents,
        "processing": true,
        "serverSide": true,
        "iDeferLoading": 0,
        "pageLength": items
    });
    browse(currentFolder);
}

window.addEventListener('popstate', function(e) {
    // Catch forward/backward navigation and reload the view.
    let query = window.location.search.substr(1).split('&').reduce(
        function(acc, kv) {
            let xy = kv.split('=', 2);
            acc[xy[0]] = xy.length == 1 || decodeURIComponent(xy[1]);
            return acc;
        }, {});

    browse('dir' in query ? query.dir : '');
});

function topInformation(dir, showAlert) {
    if (typeof dir != 'undefined') {
        Yoda.call('vault_collection_details',
                  {path: Yoda.basePath + dir}).then((data) => {
            var statusText = "";
            var basename = data.basename;
            var metadata = data.metadata;
            var vaultStatus = data.status;
            var vaultActionPending = data.vault_action_pending;
            var hasWriteRights = "yes";
            var hasDatamanager = data.has_datamanager;
            var isDatamanager = data.is_datamanager;
            var researchGroupAccess = data.research_group_access;
            var researchPath = data.research_path;
            var actions = [];

            $('.btn-group button.metadata-form').hide();
            $('.top-information').hide();
            $('.top-info-buttons').hide();

            let folderName = htmlEncode(basename).replace(/ /g, "&nbsp;");

            $('.top-information').show();
            $('.top-info-buttons').show();

            $('.btn-group button.metadata-form').attr('data-path', dir);
            $('.btn-group button.metadata-form').show();

            $('.actionlog').hide();
            let actionLogIcon = ` <i class="fa fa-book actionlog-icon" data-folder="${htmlEncode(dir)}" aria-hidden="true" title="Show provenance information"></i>`;

            $('.system-metadata').hide();
            let systemMetadataIcon = ` <i class="fa fa-info-circle system-metadata-icon" data-folder="${htmlEncode(dir)}" aria-hidden="true" title="Show system metadata"></i>`;

        });
    } else {
        $('.top-information').hide();
    }
}

function vaultAccess(action, folder)
{
    $('.btn-group button.folder-status').prop("disabled", true).next().prop("disabled", true);

    $.post("access", {"path" : decodeURIComponent(folder), "action" : action}, function(data) {
        if (data.data.status != 'Success') {
            Yoda.set_message('error', data.statusInfo);
        }

        topInformation(folder, false);
    }, "json");
}

function metadataInfo(dir) {
    /* Loads metadata of the vault packages */
    let pathParts = dir.split('/');

    // Do not show metadata outside data package.
    if (pathParts.length < 3) {
        $('.metadata-info').hide();
        return;
    } else {
        pathParts.length = 3;
        dir = pathParts.join("/");
    }

    try {
        Yoda.call('meta_form_load',
            {coll: Yoda.basePath + dir},
            {rawResult: true})
        .then((result) => {
            if (!result || jQuery.isEmptyObject(result.data))
                return console.info('No result data from meta_form_load');

            let metadata = result.data.metadata;
            let date_deposit = result.data.deposit_date;
            let date_end_preservation = result.data.deposit_end_preservation_date
            $('.metadata-info').show();

            console.log(result.data)
            console.log(metadata);

            // Owner(s) - within yoda-metadata.json Creator
            let creators = [];
            for (let c in metadata.Creator){
                let fullname = "".concat(metadata.Creator[c].Name.Given_Name, " ", metadata.Creator[c].Name.Family_Name);
                fullname = fullname + ' (' + metadata.Creator[c].Owner_Role + ')'
                creators.push(fullname);
            }
            $('.metadata-creator').text(creators.join(', '));

            $(".metadata-title").text(metadata.Title);

            if (metadata.Description){
                let description = metadata.Description;
                let wordCount = description.match(/(\w+)/g). length;
                if (wordCount < 50 ){
                    $(".metadata-description").text(description);
                } else {
                    $(".metadata-description").text(truncate(description, 50));
                    $('.read-more-button').show();
                    $('.read-more-button').on('click', function(){
                        $(".metadata-description").text(description);
                        $('.read-more-button').hide();
                        $('.read-less-button').show();
                    })
                    $('.read-less-button').on('click', function(){
                        $(".metadata-description").text(truncate(description, 50));
                        $('.read-more-button').show();
                        $('.read-less-button').hide();
                    })
                }
            }

            // $('.metadata-identifier').text('BLABLA');

            $('.metadata-keywords').text(metadata.Tag.toString());
            $('.metadata-research-group').text(metadata.Research_Group);
            $('.metadata-project').text(metadata.Collection_Name);

            let owners = [];
            for (let c in metadata.Creator){
                let fullname = "".concat(metadata.Creator[c].Name.Given_Name, " ", metadata.Creator[c].Name.Family_Name);
                fullname = fullname + ', ' + metadata.Creator[c].Affiliation + ', ' + metadata.Creator[c].Owner_Role
                owners.push(fullname);
            }
            $('.metadata-owners').text(owners.join('<br>'));

            // Contact person is placed within contributors. Only 1
            let contributors = [];
            for (let c in metadata.Contributor){
                let fullname = "".concat(metadata.Contributor[c].Name.Given_Name, " ", metadata.Contributor[c].Name.Family_Name);
                contributors.push(fullname);
            }

            // Contact person - within yoda-metadata.json Contributor
            $('.metadata-contact-person').text(contributors.join(', '));

            $('.metadata-research-period').text(metadata.Collected.Start_Date + ' ' + metadata.Collected.End_Date);

            let geolocations = [];
            for (let c in metadata.GeoLocation){
                let loc = metadata.GeoLocation[c];
                let fullname = loc.Description_Spatial;
                
                fullname += loc.geoLocationBox.eastBoundLongitude.toString()
                fullname += loc.geoLocationBox.northBoundLatitude.toString()
                // loc.geoLocationBox.southBoundLatitude.toString()
                // loc.geoLocationBox.westBoundLongitude.toString()

                geolocations.push(fullname);
            }
            $('.metadata-geo-locations').text(geolocations.join(', '));

            let references = [];
            for (let c in metadata.Related_Datapackage){
                let fullname = metadata.Related_Datapackage[c].Title;
                fullname = fullname + ', ' + metadata.Related_Datapackage[c].Persistent_Identifier.Identifier_Scheme
                fullname = fullname + ' ' +  metadata.Related_Datapackage[c].Persistent_Identifier.Identifier
                references.push(fullname);
            }
            $('.metadata-references').text(references.join('<br>'));

            $('.metadata-personal-data').text(metadata.Data_Classification);

            $('.metadata-deposit-date').text(date_deposit);
            $('.metadata-retention-period').text(date_end_preservation + " (" + metadata.End_Preservation + " years)");


            // $(".metadata-access").text(metadata.Data_Access_Restriction);
            // $(".metadata-data-classification").text(metadata.Data_Classification);
            // $(".metadata-license").text(metadata.License);
        });
    }
    catch (error) {
        console.error(error);
    }
}

function truncate(str, nr_words) {
    // Truncate string on n number of words
    return str.split(" ").splice(0,nr_words).join(" ");
}

function textToClipboard (text) {
    var dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
}
