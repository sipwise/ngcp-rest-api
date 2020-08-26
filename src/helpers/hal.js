const halson = require('halson');
const util = require('util');

module.exports = {
    json: (req, res, name, rows, page, page_rows, collection) => {
        if (page) {
            let resource = halson()
                .addLink('self', util.format('/api/%s/?page=%d&rows=%d', name, page, page_rows));
            rows.map(async (row) => {
                await resource.addLink('ngcp:' + name, util.format('/api/%s/%d', name, row.id))
            });
            resource.addLink('collection', util.format('/api/%s/', name));
            resource.addEmbed('ngcp:' + name, rows);
            resource['total_count'] = rows.length;
            return resource;
        } else {
            let row = rows;
            let resource = halson(row)
                .addLink('self', util.format('/api/%s/%d', name, row.id))
                .addLink('collection', util.format('/api/%s/', name));
            return resource;
        }
    }
}
