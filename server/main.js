const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const yup = require('yup')
const monk = require('monk')
const bodyParser = require('body-parser');
const { nanoid } = require('nanoid')

require('dotenv').config();

const db = monk(process.env.MONGODB_URI);
if(!db){
  console.log('no connection')
}
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

const app = express()
const port = process.env.PORT || 3000;
const schema = yup.object().shape({
  slug: yup.string().trim().matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required()
});

app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


app.use(express.static('client'))

// Create URL
app.post('/url', async(req, res, next) => {
  let {slug, url} = req.body;
  console.log(req.body)
  try {
    await schema.validate({
      slug,
      url,
    });
    if (!slug) {
      slug = nanoid(5);
    } else {
      const existing = await urls.findOne({ slug });
      if (existing) {
        throw new Error('Slug in use. 🍔');
      }
    }
    slug = slug.toLowerCase();
    const newUrl = {
      url,
      slug,
    };
    const created = await urls.insert(newUrl);
    res.json(created);
  } catch (error) {
    next(error);
  }
})

// Get all URLs
app.get('/urls', async(req,res,next) => {
  try {
    const allUrls = await urls.find();
    res.json(allUrls);
  } catch (error) {
    next(error);
  }
  
})

// Get one URL
app.get('/url/:id', async(req,res,next) => {
  const {id: slug} = req.params
  try {
    const url = await urls.findOne({slug});
    res.json(url);
  } catch (error) {
    next(error);
  }
  
})

// Redirect to URL
app.get('/:id', async(req,res,next) => {
  const {id: slug} = req.params
  try {
    const url = await urls.findOne({slug});
    res.redirect(url.url);
  } catch (error) {
    next(error);
  }
  
})

// Delete URL
app.delete('/:id', async(req,res,next) => {
  const {id: slug} = req.params
  try {
    const del = await urls.remove({slug:slug});
    res.json({message:"Delete successful"});
  } catch (error) {
    next(error);
  }
  
})

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})