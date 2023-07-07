const express = require('express');
const router = express.Router();

//---------User model----------//
const User = require('../models/User');
const Habit = require('../models/Habit');

//---------Welcome Page----------//
router.get('/', (req, res) => res.render('welcome'));

//---------Dashboard GET----------//
var email = "";
router.get('/dashboard', async (req, res) => {
    try {
      email = req.query.user;
      const user = await User.findOne({ email: req.query.user });
      const habits = await Habit.find({ email: req.query.user }).exec();
  
      var days = [];
      days.push(getD(0));
      days.push(getD(1));
      days.push(getD(2));
      days.push(getD(3));
      days.push(getD(4));
      days.push(getD(5));
      days.push(getD(6));
  
      res.render('dashboard', { habits, user, days });
    } catch (err) {
      console.log(err);
      // Handle the error and send an appropriate response
    }
  });
  
//------------------Function to return date string--------------//
function getD(n) {
    let d = new Date();
    d.setDate(d.getDate() + n);
    var newDate = d.toLocaleDateString('pt-br').split( '/' ).reverse( ).join( '-' );
    var day;
    switch (d.getDay()) {
        case 0: day = 'Sun';
            break;
        case 1: day = 'Mon';
            break;
        case 2: day = 'Tue';
            break;
        case 3: day = 'Wed';
            break;
        case 4: day = 'Thu';
            break;
        case 5: day = 'Fri';
            break;
        case 6: day = 'Sat';
            break;
    }
    return { date: newDate, day };
}

//-------------Handle Change View: Daily <--> Weekly--------------//
router.post('/user-view', (req, res) => {
    User.findOne({
        email
    })
        .then(user => {
            user.view = user.view === 'daily' ? 'weekly' : 'daily';
            user.save()
                .then(user => {
                    return res.redirect('back');
                })
                .catch(err => console.log(err));
        })
        .catch(err => {
            console.log("Error changing view!");
            return;
        })
})

//---------Dashboard Add Habit----------//
router.post('/dashboard', (req, res) => {
    const { content } = req.body;

    Habit.findOne({ content: content, email: email }).then(habit => {
        if (habit) {
            //---------Update existing habit----------//
            let dates = habit.dates, tzoffset = (new Date()).getTimezoneOffset() * 60000;
            var today = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
            dates.find(function (item, index) {
                if (item.date === today) {
                    console.log("Habit exists!")
                    req.flash(
                        'error_msg',
                        'Habit already exists!'
                    );
                    res.redirect('back');
                }
                else {
                    dates.push({ date: today, complete: 'none' });
                    habit.dates = dates;
                    habit.save()
                        .then(habit => {
                            console.log(habit);
                            res.redirect('back');
                        })
                        .catch(err => console.log(err));
                }
            });
        }
        else {
            let dates = [], tzoffset = (new Date()).getTimezoneOffset() * 60000;
            var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
            dates.push({ date: localISOTime, complete: 'none' });
            const newHabit = new Habit({
                content,
                email,
                dates
            });

            //---------Save Habit----------//
            newHabit
                .save()
                .then(habit => {
                    console.log(habit);
                    res.redirect('back');
                })
                .catch(err => console.log(err));
        }
    })
});

//---------Dashboard Add/Remove Habit to/from Favorites----------//
router.get("/favorite-habit", (req, res) => {
    let id = req.query.id;
    Habit.findOne({
        _id: {
            $in: [
                id
            ]
        },
        email
    })
        .then(habit => {
            habit.favorite = habit.favorite ? false : true;
            habit.save()
                .then(habit => {
                    req.flash(
                        'success_msg',
                        habit.favorite ? 'Habit added to Favorites!' : 'Habit removed from Favorites!'
                    );
                    return res.redirect('back');
                })
                .catch(err => console.log(err));
        })
        .catch(err => {
            console.log("Error adding to favorites!");
            return;
        })
});

//-------------Update status of habit completion--------------//
router.get("/status-update", async (req, res) => {
    try {
      const d = req.query.date;
      const id = req.query.id;
      const habit = await Habit.findById(id);
  
      if (!habit) {
        console.log("Habit not found");
        // Handle the case when the habit is not found
        return;
      }
  
      let dates = habit.dates;
      let found = false;
      dates.find(function (item) {
        if (item.date === d) {
          if (item.complete === 'yes') {
            item.complete = 'no';
          } else if (item.complete === 'no') {
            item.complete = 'none';
          } else if (item.complete === 'none') {
            item.complete = 'yes';
          }
          found = true;
        }
      });
      if (!found) {
        dates.push({ date: d, complete: 'yes' });
      }
      habit.dates = dates;
      await habit.save();
  
      console.log(habit);
      res.redirect('back');
    } catch (err) {
      console.log("Error updating status:", err);
      // Handle the error and send an appropriate response
    }
  });
  
//---------Deleting a habit----------//
router.get("/remove", async (req, res) => {
    try {
      const id = req.query.id;
      await Habit.deleteMany({
        _id: { $in: [id] },
        email,
      });
  
      req.flash('success_msg', 'Record(s) deleted successfully!');
      return res.redirect('back');
    } catch (err) {
      console.log("Error in deleting record(s)!", err);
      // Handle the error and send an appropriate response
    }
  });
  
module.exports = router;