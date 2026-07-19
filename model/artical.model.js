//model mongo
const mongoose = require('mongoose');
const slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

const articalSchema = new mongoose.Schema(
    {    
        title : String,
        description: String,
        category_id: String,
        post: String,
        thumbnail: String,
        status: String,
        position: { // Thêm trường position
            type: Number,
            default: 0
        },     
        createBy :{
            accountId: String,
            createdAt: {
                type: Date,
                default: Date.now
            }
        },
        slug: {
            type: String,
            slug:"title",
            unique: true
        },
        deleted: {
            type: Boolean,
            default: false
        },   
        deletedBy:{
            accountId: String,
            deletedAt: Date
        },
        updatedBy:[
            {
                accountId: String,
                updatedAt: Date
            }
        ],
        deletedBy:[
            {
                accountId: String,
                deletedAt: Date
            }
        ],
        restoredBy:[
            {
                accountId: String,
                restoredAt: Date
            }
        ],
    },
);

const artical = mongoose.model('artical',articalSchema,"Articals")

module.exports = artical;